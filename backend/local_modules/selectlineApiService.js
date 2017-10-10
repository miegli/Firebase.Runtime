/**
 * Copyright (c) 2017 by Michael Egli
 *
 * Provides selectline API service
 *
 */

'use strict';

class selectlineApiService {


    /**
     *
     * constructs the service
     * @param string apiEndpoint
     * @param string userName
     * @param string password
     * @return void
     *
     */
    init(apiEndpoint, userName, password) {

        /**
         * selectline config
         */
        this.config = {
            'Api': apiEndpoint + "/",
            'UserName': userName,
            'Password': password,
            'login': {
                'TokenType': null,
                'AccessToken': null
            }
        };

        /**
         * http request
         */
        this.request = require('request-promise');


        /**
         * authenticate selectline api
         *
         * @return mixed
         *
         */
        this.authenticate = function () {

            var self = this;
            var deferred = new Deferred();


            self.request({
                method: 'POST',
                uri: this.config.Api + 'login',
                body: {
                    'UserName': this.config.UserName,
                    'Password': this.config.Password
                },
                headers: {
                    'content-type': 'application/json'
                },
                rejectUnauthorized: false,
                requestCert: true,
                agent: false,
                json: true // Automatically stringifies the body to JSON
            }).then(function (login) {

                if (login.TokenType !== undefined && login.AccessToken !== undefined) {

                    self.config.login = {
                        'TokenType': login.TokenType,
                        'AccessToken': login.AccessToken
                    };

                    deferred.resolve(self.config.login);

                }

            }).catch(function (err) {

                self.config.login = {
                    'TokenType': false,
                    'AccessToken': false
                };

                deferred.reject(err.response !== undefined ? err.response.body : err);

            });


            return deferred.promise;


        }

    }


    /**
     * execute request against the api
     *
     * @param string uri
     * @param string method
     * @param mixed data (body request)
     * @param mixed callingDeferrer (calling deferrer)
     * @param mixed deferred (internal deferrer)
     * @return mixed
     *
     */
    call(uri, method, data, callingDeferred, deferred) {


        var self = this;

        if (deferred === undefined) {
            var deferred = new Deferred();
            deferred.tries = -1;
        }

        if (callingDeferred == undefined) {
            var callingDeferred = new Deferred();
        }


        deferred.tries++;

        if (self.config.login.TokenType !== null) {



            self.request({
                method: method !== undefined ? method : 'GET',
                uri: self.config.Api + uri,
                body: data,
                headers: {
                    'AUTHORIZATION': self.config.login.TokenType + ' ' + self.config.login.AccessToken,
                    'content-type': 'application/json'
                },
                rejectUnauthorized: false,
                requestCert: true,
                agent: false,
                json: true // Automatically stringifies the body to JSON
            }).then(function (response) {

                callingDeferred.resolve(response);
                deferred.resolve(response);

            }).catch(function (err) {

                if (err.response !== undefined && err.response.body.ResponseCode == '10-002') {

                    // login required, try to re-authenticate once
                    if (deferred.tries < 1) {

                        self.authenticate().then((data) => {
                            self.call(uri, callingDeferred, deferred);
                        });
                    } else {
                        // reject error in authentication
                        deferred.reject(err.response !== undefined ? err.response.body : err);
                        callingDeferred.reject(err.response !== undefined ? err.response.body : err);
                    }

                } else {


                    // try to call once again
                    if (deferred.tries < 2) {
                        callingDeferred.promise.catch((e) => {});
                        callingDeferred.reject(null);
                        self.call(uri, method, data, callingDeferred, deferred);
                    } else {
                        // reject error in response
                        deferred.reject(err.response !== undefined ? err.response.body : err);
                        callingDeferred.reject(err.response !== undefined ? err.response.body : err);
                    }

                }

            });

        } else {
            self.authenticate().then((response) => {
                // call again after successfull authentaction
                self.call(uri, method, data, callingDeferred, deferred);
            }).catch((err) => {
                // reject error in authentication
                deferred.reject(err.response !== undefined ? err.response.body : err);
            });
        }

        return deferred.promise;


    }


}

module.exports = new selectlineApiService;


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

    }
}