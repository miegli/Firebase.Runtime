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

const uuidv1 = require('uuid/v1');

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
        this.firestore = this.admin.firestore();
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
     * @param integer time
     * @return void
     *
     */
    message(userid, title, time) {

        var self = this;
        var u = uuidv1();
        this.db.ref('user/' + userid + '/notification/' + u).set(title);
        setTimeout(function () {
            self.db.ref('user/' + userid + '/notification/' + u).remove();
        }, time ? time : 3000);

    }

    /**
     *
     * push error notification to user if he's online
     *
     * @param string userid
     * @param string title
     * @param integer time
     * @return void
     *
     */
    error(userid, title, time) {

        var self = this;
        var u = uuidv1();
        this.db.ref('user/' + userid + '/error/' + u).set(title);
        setTimeout(function () {
            self.db.ref('user/' + userid + '/error/' + u).remove();
        }, time ? time : 3000);
    }

    /**
     *
     * push warning notification to user if he's online
     *
     * @param string userid
     * @param string title
     * @param integer time
     * @return void
     *
     */
    warning(userid, title, time) {


        var self = this;
        var u = uuidv1();
        this.db.ref('user/' + userid + '/warning/' + u).set(title);
        setTimeout(function () {
            self.db.ref('user/' + userid + '/warning/' + u).remove();
        }, time ? time : 3000);

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
        var firestore = this.admin.firestore();
        var self = this;

        this.db.ref("_events").on(
            "child_added",
            function (snapshot) {

                var e = snapshot.val();
                var eventId = snapshot.key;

                self.watchers.forEach(function (watcher) {

                    if (
                        (e.object === watcher.object || watcher.object === null) &&
                        (e.project === watcher.project || watcher.project === null) &&
                        (e.source === watcher.source || watcher.source === null) &&
                        (e.action === watcher.action || watcher.action === null)
                    ) {

                        var deferred = new Deferred();


                        switch (e.action) {

                            case 'write':

                                if (e.source == 'firestore') {

                                    firestore.doc('session/' + e.user + '/' + e.project + '/' + e.object + '/' + e.objectid + '/data').get().then((doc) => {
                                        watcher.callback({
                                                user: e.user,
                                                object: e.object,
                                                objectId: e.objectid,
                                                project: e.project,
                                                action: e.action,
                                                source: e.source,
                                                eventId: null,
                                                data: doc.data()
                                            },
                                            deferred);
                                    });


                                    /* after promise */
                                    deferred.promise.then((data) => {
                                        // reset storage data

                                        firestore.doc('session/' + e.user + '/' + e.project + '/' + e.object + '/' + e.objectid + '/_action/'+e.action).delete().then(() => {
                                            // Document deleted successfully.
                                        });

                                        // remove finished event
                                        db.ref('_events/' + eventId).remove();

                                    }).catch((err) => {
                                        // error event
                                        console.log(err);
                                    });


                                } else {

                                    /* Signal slog "write" */
                                    db.ref('session/' + e.user + '/' + e.project + '/' + e.object + '/' + e.objectid + '/data').once('value', function (data) {
                                        watcher.callback({
                                                user: e.user,
                                                object: e.object,
                                                objectId: e.objectid,
                                                project: e.project,
                                                action: e.action,
                                                source: e.source,
                                                eventId: null,
                                                data: data.val()
                                            },
                                            deferred);
                                    });

                                    /* after promise */
                                    deferred.promise.then((data) => {
                                        // reset storage data
                                        db.ref('session/' + e.user + '/' + e.project + '/' + e.object + '/' + e.objectid + '/_action/'+e.action).remove();
                                        // remove finished event
                                        db.ref('_events/' + eventId).remove();
                                    }).catch((err) => {
                                        // error event
                                        console.log(err);
                                    });


                                }


                                break;

                            default:

                                /* Signal slot "fetchObject */
                                watcher.callback({
                                        user: e.user,
                                        object: e.object,
                                        objectId: e.objectid,
                                        project: e.project,
                                        action: e.action,
                                        source: e.source,
                                        eventId: eventId
                                    },
                                    deferred
                                );



                                /* after promise */
                                deferred.promise.then((data) => {

                                    if (e.source == 'firestore') {

                                        firestore.doc('session/' + e.user + '/' + e.project + '/' + e.object + '/' + e.objectid + '/data').set(
                                            {
                                                'bind': typeof data == 'string' ? {value: data} : data,
                                                'stable': typeof data == 'string' ? {value: data} : data
                                            }
                                        ).then(() => {
                                            // Document created successfully.
                                            // remove finished event
                                           db.ref('_events/' + eventId).remove();

                                            firestore.doc('session/' + e.user + '/' + e.project + '/' + e.object + '/' + e.objectid + '/_action/'+e.action + '/' + e.actionId).delete().then(() => {
                                                // Document deleted successfully.
                                            }).catch((err) => {
                                                // remove in error event
                                                console.log(err);
                                            });



                                        });

                                    } else {

                                        // set storage data
                                        db.ref('session/' + e.user + '/' + e.project + '/' + e.object + '/' + e.objectid + '/data').set({
                                            'bind': typeof data == 'string' ? {value: data} : data,
                                            'stable': typeof data == 'string' ? {value: data} : data
                                        });

                                        // remove finished event
                                        db.ref('_events/' + eventId).remove();
                                        db.ref('session/' + e.user + '/' + e.project + '/' + e.object + '/' + e.objectid + '/_action/'+e.action).remove();

                                    }


                                }).catch((err) => {
                                    // remove in error event
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
     * @param object params
     * @param function callback function (data,deferred)
     */
    on(params, callback) {

        this.watchers.push(
            {
                object: params.object !== undefined ? params.object : null,
                action: params.action !== undefined ? params.action : null,
                project: params.project !== undefined ? params.project : null,
                source: params.source !== undefined ? params.source : null,
                callback: callback
            }
        );

        return this;
    }

    /**
     * watch read events
     * @param string object
     * @param function callback function (data,deferred)
     */
    read(object, project, callback) {
        this.watchers.push({
            object: object,
            action: 'read',
            project: project,
            source: null,
            callback: callback
        });
        return this;
    }

    /**
     * watch read events
     * @param string object
     * @param function callback function (data,deferred)
     */
    write(object, project, callback) {
        this.watchers.push({
            object: object,
            action: 'write',
            project: project,
            source: null,
            callback: callback
        });
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
    } else if (typeof(PromiseUtils) != 'undefined' && PromiseUtils.defer) {
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
        this.promise = new Promise(function (resolve, reject) {
            this.resolve = resolve;
            this.reject = reject;
        }.bind(this));
        Object.freeze(this);
    }
}