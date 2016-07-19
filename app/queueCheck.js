// call the packages we need
var cron = require('cron');
var pg = require('pg');

// get config values
var config = require('../config/config');

// setup SendGrid settings (including proxy if required)
var sendGridSettings = config.sendGridSettings;

var sendGrid = sendGridSettings.proxy ? require('sendgrid').SendGrid(sendGridSettings.api_key, { proxy: sendGridSettings.proxy }) : require('sendgrid').SendGrid(sendGridSettings.api_key);

var sendMail = require('./sendMail');

// =============================================================================
// CHECK APPLICATION DATA
// =============================================================================

// build the schedule from config values - uses CRON standard format
var minuteDataCheck = config.scheduleDataCheck.minute;
var hourDataCheck = config.scheduleDataCheck.hour;
var dayDataCheck = config.scheduleDataCheck.day;
var monthDataCheck = config.scheduleDataCheck.month;
var weekdayDataCheck = config.scheduleDataCheck.weekday;
var scheduleDataCheck = minuteDataCheck + ' ' + hourDataCheck + ' ' + dayDataCheck + ' ' + monthDataCheck + ' ' + weekdayDataCheck;

var jobDataCheck = new cron.CronJob(scheduleDataCheck, function() {

    var connectionString = config.db;

    // connect to database
    pg.connect(connectionString, function(err, client, done) {

        // Handle connection errors
        if(err) {
            done();
            console.error(err);
        }
        else {

            // =============================================================================
            // Check for applications queued or submitted in the last hour.
            // If none are found, send an email notification to subscribed addresses.
            // =============================================================================

            var messageNonQueued = 'No applications have been queued or submitted in the last hour';

            var queryNonQueued = client.query(
                "SELECT \"application_id\", \"application_reference\", \"submitted\", \"application_start_date\"" +
                " FROM \"Application\"" +
                " WHERE (\"submitted\" = 'submitted' OR \"submitted\" = 'queued')" +
                " AND \"application_start_date\" > ( NOW() - INTERVAL '1 hour' );"
            );

            // After all data is returned, close connection and count number of returned rows
            queryNonQueued.on('end', function (results) {
                done();

                if (results.rowCount < 1) { // if none found

                    // log message in log file
                    console.info('[FCO-LOI-Submission-Message-Queue-Check-Queued-Applications-Error] ' + messageNonQueued);

                    // send email notification if configured to do so
                    if (config.sendEmails == 'Y') {
                        sendMail.sendNotificationEmail(sendGrid, config, messageNonQueued);
                    }
                }
            });


            // =================================================================================================
            // Check for any applications with a status of draft which have an entry in ExportedApplicationData
            // This is a symptom of the application not being added to the queue correctly.
            // If any are found, send an email notification and list the affected applications
            // =================================================================================================

            var messageDraftApplications = 'There are potential issues with queueing applications. The following application IDs may not have been queued correctly:\n';

            var queryDraftApplications = client.query(
                "SELECT a.\"application_id\", a.\"application_reference\", a.\"application_start_date\"" +
                " FROM \"Application\" AS a " +
                " INNER JOIN \"ExportedApplicationData\" AS ead ON a.\"application_id\" = ead.\"application_id\"" +
                " WHERE a.\"submitted\" = 'draft';"
            );

            var results = [];

            // Stream results back one row at a time
            queryDraftApplications.on('row', function (row) {
                results.push(row);
            });

            // After all data is returned, close connection and return results
            queryDraftApplications.on('end', function() {
                done();

                // if we find any results then send an email notification containing affected application IDs
                if (results.length > 0) {

                    results.forEach(function(value) {
                        messageDraftApplications = messageDraftApplications + '\n' + value.application_id + '\n';
                    });

                    // log message in log file
                    console.info('[FCO-LOI-Submission-Message-Queue-Check-Draft-Applications-Error] ' + messageDraftApplications);

                    // send email notification if configured to do so
                    if (config.sendEmails == 'Y') {
                        sendMail.sendNotificationEmail(sendGrid, config, messageDraftApplications);
                    }
                }
            });
        }
    });

}, null, true);
