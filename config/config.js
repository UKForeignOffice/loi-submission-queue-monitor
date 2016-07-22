process.env.NODE_ENV = process.env.NODE_ENV || 'debug';
var dotenv = require('dotenv');
var env = dotenv.config();

// =============================================================================
// NOTE: the application is configured to run as a service as defined in:
//          /etc/init/fco-queue-monitor.conf
//
//
// Configuration options are defined in the .env file which is not stored in
// source control for security reasons
//
// Overview of the available configuration options:
// - DBCONN: connection string for the database
// - SCHEDULEDATACHECK: JSON object setting values in line with standard Cron
// - SEDNGRID: JSON object for SendGrid API credentials
// - SUBSCRIBERS: list of email addresses to notify, separated by semicolon
// - SENDEMAILNOTIFICATIONS: turn on or off notifications, Y or N
// - ENVIRONMENT: the current environment, appears in email notifications
// =============================================================================

var dbConn = env.DBCONN;
var scheduleDataCheck = JSON.parse(env.SCHEDULEDATACHECK);
var sendGridSettings = JSON.parse(env.SENDGRID);
var subscribers = env.SUBSCRIBERS;
var sendEmails = env.SENDEMAILNOTIFICATIONS;
var environment = env.ENVIRONMENT;

var config = {
    'db': dbConn,
    'scheduleDataCheck': scheduleDataCheck,
    'sendGridSettings' : sendGridSettings,
    'subscribers' : subscribers,
    'sendEmails' : sendEmails,
    'environment' : environment
};

module.exports = config;