
// initialise Winston logger
require('./config/logger');

// pull in and run application components
require('./app/queueCheck');
require('./app/queueRestart');


