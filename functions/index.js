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


const functions = require('firebase-functions');
const admin = require('firebase-admin');
const request = require('request-promise');
const uuidV1 = require('uuid/v1');

admin.initializeApp(functions.config().firebase);

/**
 * Emit event "fetchObject" on firebase database
 *
 */
exports.fetchObjectFromDatabase = functions.database.ref('user/{userid}/storage/{object}/{objectid}/version').onWrite(event => {
    const date = new Date();

    admin.database().ref('_events/' + uuidV1()).set({
        'date': date.getTime(),
        'object': event.params.object,
        'objectid': event.params.objectid,
        'userid': event.params.userid,
        'function': 'fetchObject',
        'source': 'database'
    });

});

/**
 * Emmit event "saveObject" on firebase database
 *
 */
exports.saveObjectFromDatabase = functions.database.ref('user/{userid}/storage/{object}/{objectid}/saved').onWrite(event => {

    if (event.data.val()) {
        admin.database().ref('user/' + event.params.userid + '/storage/' + event.params.object + '/' + event.params.objectid + '/data').once('value', function (data) {
            const date = new Date();
            admin.database().ref('_events/' + uuidV1()).set({
                'date': date.getTime(),
                'object': event.params.object,
                'objectid': event.params.objectid,
                'userid': event.params.userid,
                'function': 'saveObject',
                'source': 'database'
            });

        });
    }

});


/**
 * Emit event "fetchObject" on firebase firestore
 *
 */
exports.fetchObjectFromFirestore = functions.firestore.document('user/{userid}/storage/{object}/{objectid}/version').onWrite(event => {
    const date = new Date();

    admin.database().ref('_events/' + uuidV1()).set({
        'date': date.getTime(),
        'object': event.params.object,
        'objectid': event.params.objectid,
        'userid': event.params.userid,
        'function': 'fetchObject',
        'source': 'firestore'
    });

});


/**
 * Emmit event "saveObject" on firebase firestore
 *
 */
exports.saveObjectFromFirestore = functions.firestore.document('user/{userid}/storage/{object}/{objectid}/saved').onWrite(event => {

    if (event.data && event.data.data() && Object.keys(event.data.data()).length) {
        const date = new Date();
        admin.database().ref('_events/' + uuidV1()).set({
            'date': date.getTime(),
            'object': event.params.object,
            'objectid': event.params.objectid,
            'userid': event.params.userid,
            'function': 'saveObject',
            'source': 'firestore'
        });
    }


});
