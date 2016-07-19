// call the packages we need
var cron = require('cron');
var exec = require('child_process').exec;

// get config values
var config = require('../config/config');

// get email sender
var sendMail = require('./sendMail');

// =============================================================================
// RESTART RABBITMQ PROCESSES
// =============================================================================

// build the schedule from config values - uses CRON standard format
var minuteQueueRestart = config.scheduleQueueRestart.minute;
var hourQueueRestart = config.scheduleQueueRestart.hour;
var dayQueueRestart = config.scheduleQueueRestart.day;
var monthQueueRestart = config.scheduleQueueRestart.month;
var weekdayQueueRestart = config.scheduleQueueRestart.weekday;
var scheduleQueueRestart = minuteQueueRestart + ' ' + hourQueueRestart + ' ' + dayQueueRestart + ' ' + monthQueueRestart + ' ' + weekdayQueueRestart;

// job to restart the RabbitMQ processes
var jobQueueRestart = new cron.CronJob(scheduleQueueRestart, function() {

    /*

    // log output of shell commands to log file
    function puts(error, stdout, stderr) {console.info(stdout)}

    console.info('[FCO-LOI-Submission-Message-Queue-Restart-Queue] ' + 'Stopping all RabbitMQ processes...');
    exec("sudo killall –u rabbitmq", puts);
    console.info('[FCO-LOI-Submission-Message-Queue-Restart-Queue] ' + 'RabbitMQ successfully stopped');

    console.info('[FCO-LOI-Submission-Message-Queue-Restart-Queue] ' + 'Starting RabbitMQ...');
    exec("sudo service rabbitmq-server start", puts);

    //check service is running?
    //'[FCO-LOI-Submission-Message-Queue-Restart-Queue-Error] ' +

    console.info('[FCO-LOI-Submission-Message-Queue-Restart-Queue] ' + 'RabbitMQ successfully started');

    */

}, null, true);
