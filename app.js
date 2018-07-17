// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

const { BotFrameworkAdapter, MemoryStorage } = require('botbuilder');
const { DialogSet } = require('botbuilder-dialogs');
const BotStateManager = require('./botStateManager');

var express = require('express')
const moment = require('moment');
const _ = require('lodash');

const { LuisRecognizer } = require('botbuilder-ai');

const appId = '<YOUR-APP-ID>';
const subscriptionKey = '<YOUR-SUBSCRIPTION-KEY>';

// Default is westus
const serviceEndpoint = 'https://westus.api.cognitive.microsoft.com';

const model = new LuisRecognizer({
    appId: appId,
    subscriptionKey: subscriptionKey,
    serviceEndpoint: serviceEndpoint
});

// Create server
let server = express();
let port = process.env.port || process.env.PORT || 3978;
server.listen(port, function() {
    console.log(`${server.name} listening on ${port}`);
});

// Create adapter
const adapter = new BotFrameworkAdapter({
    appId: process.env.MICROSOFT_APP_ID,
    appPassword: process.env.MICROSOFT_APP_PASSWORD
});

// Add state middleware
const state = new BotStateManager(new MemoryStorage());
adapter.use(state);

function isEmpty(str) {
    return (!str || 0 === str.length);
}

// Listen for incoming requests
server.post('/api/messages', (req, res) => {
    // Route received request to adapter for processing
    adapter.processActivity(req, res, async context => {
        if (context.activity.type === 'conversationUpdate' && context.activity.membersAdded[0].name === 'Bot') {
            // Welcome message here, bot will message you first
            await context.sendActivity(`Hello! I'm a simple project planning bot for the AzureCAT WWAH. I'll show you the top scoring intent, confidence score, and entities for what you type.`);
            let examples = `Some examples:`;
            examples += `\n- Show me all docs for Wipro`;
            examples += `\n- Show me all people with Java programming skills`;
            examples += `\n- Show me all people who are free from September 2018 to November 2018`;
            examples += `\n- How are you?`;
            examples += `\n- Help`;
            examples += `\n- What is the weather like today?`;
            await context.sendActivity(examples);
        } else if (context.activity.type === 'message') {
            const utterance = (context.activity.text || '').trim().toLowerCase();
            console.log('utterance:' + utterance);

            // Create dialog context
            const dc = dialogs.createContext(context, state);

            let topIntent;
            let topIntentScore;
            let entities = [];

            // Call LUIS model
            await model
                .recognize(context)
                .then(res => {
                    // Resolve intents and entities returned from LUIS
                    topIntent = LuisRecognizer.topIntent(res);
                    console.log('topIntent: ' + topIntent);
                    topIntentScore = res.intents[topIntent].score
                    console.log('topIntentScore: ' + topIntentScore);
                    let rawEntities = Object.values(res.entities);
                    let entity;
                    for (let i = 0; i < rawEntities.length; i++) {
                        entity = rawEntities[i];
                        let type = entity[0].type;
                        if ( (type === 'daterange') || (type === 'date') ) {
                            entity = entity[0].timex[0];
                        }
                        entities.push(entity);
                    }
                    console.log('entities: ' + entities);
                })
                .catch(err => {
                    console.log(err);
                });

            let response = 'top intent:';
            if (!isEmpty(topIntent)) {
                response += '**' + topIntent + '**';
            }
            response += '\nconfidence score: ';
            if (!isEmpty(topIntentScore)) {
                response += '**' + topIntentScore + '**';
            }
            response += '\nentities: ';
            if (!isEmpty(entities)) {
                response += '**' + entities + '**';
            }

            await context.sendActivity(response);
        }
    });
});

const dialogs = new DialogSet();
