/**
 * Copyright (c) 2017 by Michael Egli
 *
 * Provides selectline API service
 *
 */

'use strict';

const uuidv1 = require('uuid/v1');


class selectlineApiWrapper {


    /**
     *
     * constructs the service
     * @param selectlineApiService selectlineApiService
     * @param string userName
     * @param string password
     * @return void
     *
     */
    constructor(selectlineApiService) {
        /**
         * selectline config
         */
        this.api = selectlineApiService;
    }


    /**
     *
     * get all customers
     * @return Promise
     *
     */
    getCustomers() {

        return new Promise((resolve, reject) => {

            this.api.call('Customers?Items=99999', 'GET', {}).then((data) => {

                var filtered = {};
                for (var key in data) {
                    filtered[data[key].Number] = {
                        'Number': data[key].Number,
                        'Company': data[key].Company
                    }

                }
                resolve(filtered);
            }).catch((error) => {
                reject(error);
            });

        });

    }


    /**
     *
     * get all customers
     * @param integer customerId
     * @return Promise
     *
     */
    getCustomer(customerId) {

        return new Promise((resolve, reject) => {

            this.api.call('Customers/' + customerId, 'GET', {}).then((data) => {
                resolve(data);
            }).catch((error) => {
                reject(error);
            });

        });

    }

    /**
     *
     * get a document (Beleg) by number
     * @param integer documentNr
     * @return Promise
     *
     */
    getDocumentByNumber(documentNr) {

        return this.executeQuery("SELECT TOP 1 * FROM [Beleg] WHERE Belegnummer = '" + documentNr + "'");

    }


    /**
     *
     * get positions of document (Beleg) by documents number
     * @param integer documentNr
     * @return Promise
     *
     */
    getPositionsByDocumentNumber(documentNr) {

        return this.executeQuery("SELECT * FROM [Belegp] WHERE Belegnummer = '" + documentNr + "'");

    }


    /**
     *
     * add a journal
     * @param integer documentNr
     * @param string name
     * @param string text
     * @return Promise
     *
     */
    addJournal(documentNr, name, text) {

        var datetime = new Date().toJSON().substring(0, 19).replace('T', ' ');


        var query = `
        
INSERT INTO [JOURNAL]
           ([ID]
           ,[KontaktartenID]
           ,[StatusID]
           ,[Bezeichnung]
           ,[Datum]
           ,[Text]
           ,[Privatkontakt]
           ,[FreierText1]
           ,[FreierText2]
           ,[FreieZahl1]
           ,[FreieZahl2]
           ,[FreieZahl3]
           ,[FreieZahl4]
           ,[FreiesDatum1]
           ,[FreiesDatum2]
           ,[FreiesKennzeichen1]
           ,[FreiesKennzeichen2]
           ,[FreiesKennzeichen3]
           ,[FreiesKennzeichen4]
           ,[AngelegtAm]
           ,[AngelegtVon]
           ,[BearbeitetAm]
           ,[BearbeitetVon]
           ,[KategorieID]
           ,[TerminAm]
           ,[Zustaendig]
           ,[Alarm]
           ,[TageDavor]
           ,[StundenDavor]
           ,[MinutenDavor]
           ,[Alarmzeitpunkt]
           ,[Zyklus]
           ,[TerminProgramm]
           ,[TBXKonfig]
           ,[TBXAutoStart])
     VALUES
           ('` + uuidv1() + `'
           ,0
           ,2
           ,'` + name + `'
           ,'` + datetime + `'
           ,'` + text + `'
           ,0
           ,''
           ,''
           ,''
           ,''
           ,0
           ,0
           ,null
           ,null
           ,''
           ,''
           ,''
           ,''
           ,'` + datetime + `'
           ,''
           ,'` + datetime + `'
           ,''
           ,0
           ,null
           ,''
           ,''
           ,0
           ,0
           ,0
           ,null
           ,0
           ,0
           ,0
           ,''
           )
                    
        
        `;


        return this.executeQuery(query);

    }


    /**
     *
     * adds a signature to a document
     * @param string documentNr
     * @param string picture
     * @return Promise
     *
     */
    addDocumentSignature(documentNr, picture) {

        var self = this;

        return new Promise((resolve, reject) => {

            self.getDocumentByNumber(documentNr).then((document) => {

                let data = {
                    'Picture': picture,
                    'DocumentType': document.Belegtyp,
                    'DocumentNumber': documentNr,
                    'TransferId': Math.floor(Date.now() / 1000),
                };

                //
                self.api.call('Signatures', 'POST', data).then((data) => {
                    resolve(data);
                }).catch((error) => {
                    reject(error);
                });

            }).catch((error) => {
                reject(error);
            });


        });

    }

    /**
     *
     * get all customers
     * @param integer customerId
     * @param mixed data
     * @return Promise
     *
     */
    updateCustomer(customerId, data) {

        return new Promise((resolve, reject) => {

            this.api.call('Customers/' + customerId, 'PUT', {}).then((data) => {
                resolve(data);
            }).catch((error) => {
                reject(error);
            });

        });

    }

    /**
     *
     * execute a sql query
     *
     *  -- requires installation on sql database table APIMACRO with SET [Text] = 'EXEC('' ''+@Statement+'' '')' --
     *
     * @param string query
     * @param mixed data object
     * @return Promise
     *
     */
    executeQuery(query, data) {

        var params = [];

        params.push({'Name': 'Statement', 'Value': query});

        for (var key in data) {
            params.push({'name': key, 'value': data[key]});
        }

        return this.executeMacro('Query', params);

    }

    /**
     *
     * execute a sql makro
     *
     * @param string makro name
     * @param mixed data
     * @return Promise
     *
     */
    executeMacro(makro, data) {

        if (data === undefined) {
            data = {};
        }

        return new Promise((resolve, reject) => {

                this.api.call('Macros/' + makro, 'POST', data).then((data) => {

                    var finaldata = [];

                    for (var row in data.Rows) {
                        var rowobject = {};
                        for (var col in data.Rows[row].ColumnValues) {
                            rowobject[data.ColumnNames[col]] = data.Rows[row].ColumnValues[col];
                        }
                        finaldata.push(rowobject);
                    }

                    if (finaldata.length === 1) {
                        finaldata = finaldata[0];
                    }

                    resolve(finaldata);

                }).catch((error) => {
                    reject(error);
                });

            }
        )


    }


}

module.exports = selectlineApiWrapper;


