// call the packages we need
var cron = require('cron');
var pg = require('pg');

// get config values
var config = require('../config/config');

// setup SendGrid settings (including proxy if required)
var sendGridSettings = config.sendGridSettings;

var sendGrid = sendGridSettings.proxy ? require('sendgrid').SendGrid(sendGridSettings.api_key, { proxy: sendGridSettings.proxy }) : require('sendgrid').SendGrid(sendGridSettings.api_key);

var sendMail = require('./sendMail');

// build the schedule from config values - uses CRON standard format
var minuteDataCheck = config.scheduleDataCheck.minute;
var hourDataCheck = config.scheduleDataCheck.hour;
var dayDataCheck = config.scheduleDataCheck.day;
var monthDataCheck = config.scheduleDataCheck.month;
var weekdayDataCheck = config.scheduleDataCheck.weekday;
var scheduleDataCheck = minuteDataCheck + ' ' + hourDataCheck + ' ' + dayDataCheck + ' ' + monthDataCheck + ' ' + weekdayDataCheck;

// run checks based on defined Cron schedule
var jobDataCheck = new cron.CronJob(scheduleDataCheck, function() {

    var connectionString = config.db;

    // connect to database
    var client = new pg.Client(connectionString);
    client.connect(function(err) {

        // Handle connection errors
        if(err) console.error(err)

        else {

            // =============================================================================
            // This check determines whether or not any applications have been queued or
            // submitted within the last hour. If there are none then this is a symptom
            // of possible problems with the queueing of applications. The check takes the
            // form of a database query which looks for applications created in the last
            // hour with a status of 'queued' or 'submitted'
            //
            // A sensible approach is to run the check once an hour, within the working day,
            // so on the hour between 9am and 6pm Monday to Friday. This is defined by the
            // Cron schedule in the code above
            //
            // If no applications have been queued in the last hour then a message is
            // written to the log file with an appropriate prefix, and optionally an email
            // notification is sent via SendGrid
            //
            // To requeue applications in the event of an issue being identified, use the
            // following steps:
            // -- Connect to the DATA server in the affected environment
            // -- kill all RabbitMQ processes using the command 'sudo killall -u rabbitmq'
            // -- start RabbitMQ with the command 'sudo service rabbitmq-server start'
            // -- for each affected application ID run the following command, substituting
            //    the appropriate ID in place of <APPID>:
            //       rabbitmqadmin publish exchange=submissionExchange routing_key=submission payload=<APPID>
            // =============================================================================

            var messageNonQueued = 'No applications have been queued or submitted in the last hour\n\n' +
                'Please confirm the RabbitMQ service hosted on the FCO-LOI-DATA server is running. To requeue applications in the event of an issue being identified, use the' +
                'following steps:\n\n' +
                '1) Connect to the DATA server in the affected environment\n\n' +
                '2) kill all RabbitMQ processes using the command "sudo killall -u rabbitmq"\n\n' +
                '3) start RabbitMQ with the command "sudo service rabbitmq-server start"\n\n' +
                '4) for each affected application ID run the following command, substituting the appropriate ID in place of APPID:\n\n' +
                'rabbitmqadmin publish exchange=submissionExchange routing_key=submission payload=APPID';

            console.info('Running queue check - applications queued in last hour');

            var queryNonQueued = client.query(
                "SELECT \"application_id\", \"application_reference\", \"submitted\", \"application_start_date\"" +
                " FROM \"Application\"" +
                " WHERE (\"submitted\" = 'submitted' OR \"submitted\" = 'queued')" +
                " AND \"application_start_date\" > ( NOW() - INTERVAL '1 hour' );",
                function(err, results) {
                    if(err) console.error(err);

                    if (results && results.rowCount < 1) { // if none found

                        // log message in log file
                        console.info('[FCO-LOI-Submission-Message-Queue-Check-Queued-Applications-Error] ' + messageNonQueued);

                        // send email notification if configured to do so
                        if (config.sendEmails == 'Y') {
                            sendMail.sendNotificationEmail(sendGrid, config, messageNonQueued);
                        }
                    }

                    // disconnect the client
                    client.end(function (err) {
                        if (err) console.error(err);
                    });
                }
            );




            // =============================================================================
            // This check determines whether or not any applications have a status of
            // 'draft' but also have a corresponding row in the ExportedApplicationData
            // table. If there are any then this is a symptom of possible problems with
            // the queueing of applications. The check takes the form of a database query
            //
            // A sensible approach is to run the check once an hour, within the working day,
            // so on the hour between 9am and 6pm Monday to Friday. This is defined by the
            // Cron schedule in the code above
            //
            // If any potentially affected applications are found, then a message is
            // written to the log file with an appropriate prefix, and optionally an email
            // notification is sent via SendGrid
            //
            // To requeue applications in the event of an issue being identified, use the
            // following steps:
            // -- Connect to the DATA server in the affected environment
            // -- kill all RabbitMQ processes using the command 'sudo killall -u rabbitmq'
            // -- start RabbitMQ with the command 'sudo service rabbitmq-server start'
            // -- for each affected application ID run the following command, substituting
            //    the appropriate ID in place of <APPID>:
            //       rabbitmqadmin publish exchange=submissionExchange routing_key=submission payload=<APPID>
            // =============================================================================

            var messageDraftApplications = 'There are potential issues with queueing applications. The following application IDs may not have been queued correctly:\n';

            console.info('Running queue check - draft applications with an entry in ExportedApplicationData');

            var queryDraftApplications = client.query(
                "SELECT a.\"application_id\", a.\"application_reference\", a.\"application_start_date\"" +
                " FROM \"Application\" AS a " +
                " INNER JOIN \"ExportedApplicationData\" AS ead ON a.\"application_id\" = ead.\"application_id\"" +
                " WHERE a.\"submitted\" = 'draft';",
                function(err, results) {
                    if(err) console.error(err);

                    // if we find any results then send an email notification containing affected application IDs
                    if (results && results.length > 0) {

                        results.forEach(function(value) {
                            messageDraftApplications = messageDraftApplications + '\n' + value.application_id + '\n';
                        });

                        messageDraftApplications = messageDraftApplications +
                        'Please confirm the RabbitMQ service hosted on the FCO-LOI-DATA server is running. To requeue applications in the event of an issue being identified, use the' +
                        'following steps:\n\n' +
                        '1) Connect to the DATA server in the affected environment\n\n' +
                        '2) kill all RabbitMQ processes using the command "sudo killall -u rabbitmq"\n\n' +
                        '3) start RabbitMQ with the command "sudo service rabbitmq-server start"\n\n' +
                        '4) for each affected application ID run the following command, substituting the appropriate ID in place of APPID:\n\n' +
                        'rabbitmqadmin publish exchange=submissionExchange routing_key=submission payload=APPID';

                        // log message in log file
                        console.info('[FCO-LOI-Submission-Message-Queue-Check-Draft-Applications-Error] ' + messageDraftApplications);

                        // send email notification if configured to do so
                        if (config.sendEmails == 'Y') {
                            sendMail.sendNotificationEmail(sendGrid, config, messageDraftApplications);
                        }
                    }

                    // disconnect the client
                    client.end(function (err) {
                        if (err) console.error(err);
                    });
                }
            );
        }
    });

}, null, true);
