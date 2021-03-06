/**
 * A Bot for Slack!
 */


/**
 * Define a function for initiating a conversation on installation
 * With custom integrations, we don't have a way to find out who installed us, so we can't message them :(
 */

function onInstallation(bot, installer) {
    if (installer) {
        bot.startPrivateConversation({user: installer}, function (err, convo) {
            if (err) {
                console.log(err);
            } else {
                convo.say('I am a bot that has just joined your team');
                convo.say('You must now /invite me to a channel so that I can be of use!');
            }
        });
    }
}


/**
 * Configure the persistence options
 */

var config = {};
if (process.env.MONGOLAB_URI) {
    var BotkitStorage = require('botkit-storage-mongo');
    config = {
        storage: BotkitStorage({mongoUri: process.env.MONGOLAB_URI}),
    };
} else {
    config = {
        json_file_store: ((process.env.TOKEN)?'./db_slack_bot_ci/':'./db_slack_bot_a/'), //use a different name if an app or CI
    };
}

/**
 * Are being run as an app or a custom integration? The initialization will differ, depending
 */

if (process.env.TOKEN || process.env.SLACK_TOKEN) {
    //Treat this as a custom integration
    var customIntegration = require('./lib/custom_integrations');
    var token = (process.env.TOKEN) ? process.env.TOKEN : process.env.SLACK_TOKEN;
    var controller = customIntegration.configure(token, config, onInstallation);
} else if (process.env.CLIENT_ID && process.env.CLIENT_SECRET && process.env.PORT) {
    //Treat this as an app
    var app = require('./lib/apps');
    var controller = app.configure(process.env.PORT, process.env.CLIENT_ID, process.env.CLIENT_SECRET, config, onInstallation);
} else {
    console.log('Error: If this is a custom integration, please specify TOKEN in the environment. If this is an app, please specify CLIENTID, CLIENTSECRET, and PORT in the environment');
    process.exit(1);
}

var apiai = require('botkit-middleware-apiai')({
   token: process.env.APIAI_TOKEN
});
controller.middleware.receive.use(apiai.receive);

/**
 * A demonstration for how to handle websocket events. In this case, just log when we have and have not
 * been disconnected from the websocket. In the future, it would be super awesome to be able to specify
 * a reconnect policy, and do reconnections automatically. In the meantime, we aren't going to attempt reconnects,
 * WHICH IS A B0RKED WAY TO HANDLE BEING DISCONNECTED. So we need to fix this.
 *
 * TODO: fixed b0rked reconnect behavior
 */
// Handle events related to the websocket connection to Slack
controller.on('rtm_open', function (bot) {
    console.log('** The RTM api just connected!');
});

controller.on('rtm_close', function (bot) {
    console.log('** The RTM api just closed');
    // you may want to attempt to re-open
});


/**
 * Core bot logic goes here!
 */
// BEGIN EDITING HERE!

controller.on('bot_channel_join', function (bot, message) {
    bot.reply(message, "I'm here!")
});

controller.hears('hello', ['mention', 'direct_mention', 'direct_message'], apiai.hears, function (bot, message) {
    bot.reply(message, 'Hello!');
});
/*
controller.hears(['flights'], ['direct_message', 'mention', 'direct_mention'], apiai.hears, function (bot, message) {
   if(message.fulfillment.speech !== '') {
       bot.reply(message, message.fulfillment.speech);
   } else {
       bot.reply(message, "You requested to fly to " + message.entities['destination'] + " on " + message.entities['departureDate']+".");
   }
});*/
var http = require("http");
controller.hears(['^Flight ([A-Z]{2,3}[0-9]{1,4})$'], ['direct_message'], function(bot, message){
    console.log('I hear '+message.match[1]);
    bot.reply(message, 'searching for '+message.match[1]);
    
    console.log('url: '+process.env.WEBJET_BACKEND_URL+"/json/reply/TestGetFlightInfo?ident="+message.match[1]);
    
    
    var callback = function(response){
        var str='';
        response.on('data', function(chunk){
            str+=chunk;
        });
        response.on('end',function(){
            console.log(str);
            var result = JSON.parse(str);
             console.log('result data: '+result);
        var firstFlight = result.flights[0];
        var reply ='Found a flight from '+ firstFlight.originName+' to '+ firstFlight.destinationName;
        bot.reply(message, reply);
        });
        response.on('error',function(e){
            console.log(e);
        })
    }
    http.get(process.env.WEBJET_BACKEND_URL+"/json/reply/TestGetFlightInfo?ident="+message.match[1], callback).end();
    /*
    http.get(process.env.WEBJET_BACKEND_URL+"/json/reply/TestGetFlightInfo?ident="+message.match[1], function(result) {
        console.log('result: '+result);
        console.log('result body: '+result.body);
        console.log('result data: '+result.data);
        console.log('result data: '+result.result);
        var firstFlight = result.flights[0];
        var reply ='Found a flight from '+ firstFlight.originName+' to '+ firstFlight.destinationName;
        bot.reply(message, reply);
    });*/
        
    
});
/**
 * AN example of what could be:
 * Any un-handled direct mention gets a reaction and a pat response!
 */
//controller.on('direct_message,mention,direct_mention', function (bot, message) {
//    bot.api.reactions.add({
//        timestamp: message.ts,
//        channel: message.channel,
//        name: 'robot_face',
//    }, function (err) {
//        if (err) {
//            console.log(err)
//        }
//        bot.reply(message, 'I heard you loud and clear boss.');
//    });
//});
