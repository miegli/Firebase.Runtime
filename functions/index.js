/**
 * Copyright (c) 2017 by Michael Egli
 *
 *
 *
 * firebase database structure
 *
 * - session
 * --- {userid}
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


const functions = require('firebase-functions');
const admin = require('firebase-admin');
const request = require('request-promise');
const uuidV1 = require('uuid/v1');

admin.initializeApp(functions.config().firebase);

/**
 * Connects database
 *
 */
exports.connectRealtimeDatabase = functions.database.ref('session/{user}/{project}/{object}/{objectid}/_action/{action}').onCreate(event => {
        const date = new Date();

        return admin.database().ref('_events/' + uuidV1()).set({
            'date': date.getTime(),
            'project': event.params.project,
            'object': event.params.object,
            'objectid': event.params.objectid,
            'user': event.params.user,
            'action': event.params.action,
            'source': 'database'
        }).then(function () {
            return true;
        }).catch(function (error) {
            return error;
        });

});



/**
 * Connects firestore
 *
 */
exports.connectCloudFirestore = functions.firestore.document('session/{user}/{project}/{object}/{objectid}/_action/{action}/{actionId}').onCreate(event => {
console.log(event);
        const date = new Date();
        return admin.database().ref('_events/' + uuidV1()).set({
            'date': date.getTime(),
            'project': event.params.project,
            'object': event.params.object,
            'objectid': event.params.objectid,
            'user': event.params.user,
            'action': event.params.action,
            'actionId': event.params.actionId,
            'source': 'firestore'
        }).then(function () {
            return true;
        }).catch(function (error) {
            return error;
        });



});
