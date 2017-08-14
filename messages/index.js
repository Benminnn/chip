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
var URL = require('url');
var Fs = require('fs');

var AWS = require('aws-sdk');
var azure_storage = require('azure-storage');

var fs = require('fs');

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
    var magic_8 = Array(
        'Sure',
        "It is certain",
        "It is decidedly so",
        "Without a doubt",
        "Yes definitely",
        "You may rely on it",
        "As I see it, yes",
        "Most likely",
        "Outlook good",
        "Yes",
        "Signs point to yes",
        "Reply hazy, try again",
        "Ask again later",
        "Better not tell you now",
        "Cannot predict now",
        "Concentrate and ask again",
        "Don't count on it",
        "My reply is no",
        "My sources say no",
        "Outlook not so good",
        "Very doubtful"
    );

    voicebox = magic_8[Math.floor(Math.random()*magic_8.length)];
    var content_url = get_voice(voicebox);

    var return_card = new builder.AudioCard(session);
    return_card.autostart(true);
    return_card.media([{
        profile: "audio/mpeg",
        url: content_url,
        text: voicebox
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

        var request_num = Date.now();
        var speech_name = "speech-" + request_num + ".mp3";
        var return_url = "";
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

                    /* write mp3 to azure blob storage */
                    var azure = require('azure-storage');
                    var blobService = azure.createBlobService();
                    blobService.createContainerIfNotExists('chip-speech', {
                        publicAccessLevel: 'blob'
                    }, function(error, result, response) {
                        if (!error) {
                            // if result = true, container was created.
                            // if result = false, container already existed.
                        }
                    });

                    var azure = require('azure-storage');
                    var blobService = azure.createBlobService();
                    

                    
                    fs.writeFile(__dirname  + "/speech_local/" + speech_name, data.AudioStream, function(err) {
                        if (err) {
                            return console.log(err)
                        } else {
                            blobService.createBlockBlobFromLocalFile('chip-speech', speech_name, __dirname  + "/speech_local/" + speech_name, function(error, result, response) {
                                if (error) {
                                    console.log(error);
                                }
                            });
                        }
                    });                 
                };
            };
        });

        return "https://chipjhg6z3.blob.core.windows.net/chip-speech/" + speech_name;
    };

    return requestSpeechFromAWS(message);
}