process.env.NODE_ENV = process.env.NODE_ENV || 'debug';
var dotenv = require('dotenv');
var env = dotenv.config();

var dbConn = env.DBCONN;
var scheduleDataCheck = JSON.parse(env.SCHEDULEDATACHECK);
var scheduleQueueRestart = JSON.parse(env.SCHEDULEQUEUERESTART);
var sendGridSettings = JSON.parse(env.SENDGRID);
var subscribers = env.SUBSCRIBERS;
var sendEmails = env.SENDEMAILNOTIFICATIONS;
var environment = env.ENVIRONMENT;

var config = {
    'db': dbConn,
    'scheduleDataCheck': scheduleDataCheck,
    'scheduleQueueRestart' : scheduleQueueRestart,
    'sendGridSettings' : sendGridSettings,
    'subscribers' : subscribers,
    'sendEmails' : sendEmails,
    'environment' : environment
};

module.exports = config;