/**
 * Copyright (c) 2017 by Michael Egli
 *
 *
 *
 * firebase database structure
 *
 * - user
 * --- {userid}
 * ----- storage
 * ------ {object} business objects
 * ------- {objectid} business object identifier / single record
 * --------- version (mixed, timestamp|uui|identifier) change it to fetch current content data from api
 * --------- data (mixed)
 * ---------- bind (mixed) json data of current version (is three way binding to client)
 * ---------- stable (mixed) json data of current version (is last version of fetched data)
 * --------- saved (mixed, timestamp|uui|identifier) change or set it to save current bind data back to api
 * ----- profile
 * ------ userid (integer)
 * ------ name (string)
 * ------ lastname (string)
 * ------ email (string)
 * ----- history (old and new values are stored here)
 * ----- notification (realtime notification to user)
 *
 */

'use strict';

class firebaseFunctionsConnector {


    /**
     *
     * constructs the connector
     *
     * @return void
     *
     */
    constructor() {
        this.admin = require('firebase-admin');
    }


    /**
     *
     * init app
     *
     * @param string databaseURL of firebase database endpoint
     * @param string serviceAccountKey file (relative path)
     * @return mixed
     *
     */
    init(databaseURL, serviceAccountKey) {
        /**
         * initialize firebase admin
         */
        this.admin.initializeApp({
            credential: this.admin.credential.cert(require(serviceAccountKey)),
            databaseURL: databaseURL
        });
        this.db = this.admin.database();
        this.watchers = [];
        this.watch();
        return this;

    }

    /**
     *
     * push notification to user if he's online
     *
     * @param string userid
     * @param string title
     * @return void
     *
     */
    message(userid, title) {

        var self = this;
        this.db.ref('user/' + userid + '/notification').set(title);
        setTimeout(function () {
            self.db.ref('user/' + userid + '/notification').remove();
        }, 3000);

    }

    /**
     *
     * push error notification to user if he's online
     *
     * @param string userid
     * @param string title
     * @return void
     *
     */
    error(userid, title) {

        var self = this;
        this.db.ref('user/' + userid + '/error').set(title);
        setTimeout(function () {
            self.db.ref('user/' + userid + '/error').remove();
        }, 3000);

    }

    /**
     *
     * push warning notification to user if he's online
     *
     * @param string userid
     * @param string title
     * @return void
     *
     */
    warning(userid, title) {

        var self = this;
        this.db.ref('user/' + userid + '/warning').set(title);
        setTimeout(function () {
            self.db.ref('user/' + userid + '/warning').remove();
        }, 3000);

    }


    /**
     *
     * watch for firebase events
     *
     * @return void
     *
     */
    watch() {
        /**
         * watch for events and connect signal slots
         */
        var db = this.admin.database();
        var self = this;

        this.db.ref("_events").on(
            "child_added",
            function (snapshot) {

                var e = snapshot.val();
                var eventId = snapshot.key;

                self.watchers.forEach(function (watcher) {

                    if (e.function == watcher.event && e.object == watcher.object) {

                        var deferred = new Deferred();


                        switch (e.function) {

                            case 'fetchObject':

                                /* Signal slot "fetchObject */
                                watcher.callback({
                                        userId: e.userid,
                                        object: e.object,
                                        objectId: e.objectid,
                                        eventId: eventId
                                    },
                                    deferred
                                );

                                /* after promise */
                                deferred.promise.then((data) => {

                                    // set storage data
                                    db.ref('user/' + e.userid + '/storage/' + e.object + '/' + e.objectid + '/data/bind').set(data);
                                    db.ref('user/' + e.userid + '/storage/' + e.object + '/' + e.objectid + '/data/stable').set(data);
                                    // remove finished event
                                    db.ref('_events/' + eventId).remove();
                                }).catch((err) => {
                                    // remove in error event
                                    console.log(err);
                                });

                                break;

                            case 'saveObject':


                                /* Signal slog "saveObject" */
                                db.ref('user/' + e.userid + '/storage/' + e.object + '/' + e.objectid + '/data').once('value', function (data) {
                                    watcher.callback({
                                            userId: e.userid,
                                            object: e.object,
                                            objectId: e.objectid,
                                            eventId: 0,
                                            data: data.val()
                                        },
                                        deferred);
                                });

                                /* after promise */
                                deferred.promise.then((data) => {
                                    // reset storage data
                                    db.ref('user/' + e.userid + '/storage/' + e.object + '/' + e.objectid + '/saved').remove();
                                    // remove finished event
                                    db.ref('_events/' + eventId).remove();
                                }).catch((err) => {
                                    // error event
                                    console.log(err);
                                });


                                break;
                        }
                    }


                });


            }
        );

    }

    /**
     * watch events
     * @param string object
     * @param function callback function (data,deferred)
     */
    onLoad(object, callback) {
        this.watchers.push({object: object, event: 'fetchObject', callback: callback});
        return this;
    }

    /**
     * watch events
     * @param string object
     * @param function callback function (data,deferred)
     */
    onSave(object, callback) {
        this.watchers.push({object: object, event: 'saveObject', callback: callback});
        return this;
    }


}

module.exports = new firebaseFunctionsConnector;

/**
 *
 * constructs promise
 * @return mixed
 *
 */
function Deferred() {
    // update 062115 for typeof
    if (typeof(Promise) != 'undefined' && Promise.defer) {
        //need import of Promise.jsm for example: Cu.import('resource:/gree/modules/Promise.jsm');
        return new Deferred();
    } else if (typeof(PromiseUtils) != 'undefined'  && PromiseUtils.defer) {
        //need import of PromiseUtils.jsm for example: Cu.import('resource:/gree/modules/PromiseUtils.jsm');
        return PromiseUtils.defer();
    } else {
        /* A method to resolve the associated Promise with the value passed.
         * If the promise is already settled it does nothing.
         *
         * @param {anything} value : This value is used to resolve the promise
         * If the value is a Promise then the associated promise assumes the state
         * of Promise passed as value.
         */
        this.resolve = null;

        /* A method to reject the assocaited Promise with the value passed.
         * If the promise is already settled it does nothing.
         *
         * @param {anything} reason: The reason for the rejection of the Promise.
         * Generally its an Error object. If however a Promise is passed, then the Promise
         * itself will be the reason for rejection no matter the state of the Promise.
         */
        this.reject = null;

        /* A newly created Pomise object.
         * Initially in pending state.
         */
        this.promise = new Promise(function(resolve, reject) {
            this.resolve = resolve;
            this.reject = reject;
        }.bind(this));
        Object.freeze(this);
    }
}