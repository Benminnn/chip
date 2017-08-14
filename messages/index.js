/*-----------------------------------------------------------------------------
This template demonstrates how to use an IntentDialog with a LuisRecognizer to add 
natural language support to a bot. 
For a complete walkthrough of creating this type of bot see the article at
https://aka.ms/abs-node-luis
-----------------------------------------------------------------------------*/
"use strict";
var builder = require("botbuilder");
var botbuilder_azure = require("botbuilder-azure");
var path = require('path');
var blob = require('blob');
var URL = require('url');
var Fs = require('fs');
var AWS = require('aws-sdk');

/* Buffer for text to be spoken, cleared once said */
var voicebox = "";
var speech;

var useEmulator = (process.env.NODE_ENV == 'development');

var connector = useEmulator ? new builder.ChatConnector() : new botbuilder_azure.BotServiceConnector({
    appId: process.env['MicrosoftAppId'],
    appPassword: process.env['MicrosoftAppPassword'],
    stateEndpoint: process.env['BotStateEndpoint'],
    openIdMetadata: process.env['BotOpenIdMetadata']
});

var bot = new builder.UniversalBot(connector);
bot.localePath(path.join(__dirname, './locale'));

// Make sure you add code to validate these fields
var luisAppId = process.env.LuisAppId;
var luisAPIKey = process.env.LuisAPIKey;
var luisAPIHostName = process.env.LuisAPIHostName || 'westus.api.cognitive.microsoft.com';

const LuisModelUrl = 'https://' + luisAPIHostName + '/luis/v1/application?id=' + luisAppId + '&subscription-key=' + luisAPIKey;

// Main dialog with LUIS
var recognizer = new builder.LuisRecognizer(LuisModelUrl);
var intents = new builder.IntentDialog({ recognizers: [recognizer] });

//.matches('<yourIntent>') //See details at http://docs.botframework.com/builder/node/guides/understanding-natural-language/

intents.onDefault((session) => {
    voicebox = 'Not sure what to say, sorry.';
    var voice_mp3 = get_voice(voicebox);
    voicebox = "";

    var content_url = __dirname  + "/speech.mp3";

    var return_card = new builder.AudioCard(session);
    return_card.autostart(true);
    return_card.media([{
        profile: "audio/mpeg",
        url: content_url,
    }]);

    // attach the card to the reply message
    var msg = new builder.Message(session).addAttachment(return_card);
    session.send(msg);
});

bot.dialog('/', intents);    

if (useEmulator) {
    var restify = require('restify');
    var server = restify.createServer();
    server.listen(3978, function() {
        console.log('test bot endpont at http://localhost:3978/api/messages');
    });
    server.post('/api/messages', connector.listen());    
} else {
    module.exports = { default: connector.listen() }
};

function get_voice(message){
    
    /*
    Nicole
    Russell
    Amy
    Brian
    Emma
    Raveena
    Ivy
    Joanna
    Joey
    Justin
    Kendra
    Kimberly
    Salli
    Geraint
    */

    var aws_settings = {
        awsRegion: "us-west-2",
        pollyVoiceId: "Salli",
        cacheSpeech: false
    }    
    //AWS.config.credentials = settings.awsCredentials;
    AWS.config.region = aws_settings.awsRegion;

    // Make request to Amazon polly
    function requestSpeechFromAWS(message) {
        var polly = new AWS.Polly();
        var params = {
            OutputFormat: 'mp3',
            Text: message,
            VoiceId: aws_settings.pollyVoiceId
        }

        polly.synthesizeSpeech(params, (err, data) => {
            if (err) {
                console.log(err.code)
            } else if (data) {
                if (data.AudioStream instanceof Buffer) {
                    Fs.writeFile(__dirname  + "/speech.mp3", data.AudioStream, function(err) {
                        if (err) {
                            return console.log(err)
                        }
                    })
                }
            }
        })
    };

    requestSpeechFromAWS(message);
}