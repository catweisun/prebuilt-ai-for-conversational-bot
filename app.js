// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

const dotenv = require('dotenv');
const express = require('express');
const { BotFrameworkAdapter, ActivityTypes } = require('botbuilder');
const { LuisRecognizer } = require('botbuilder-ai');

const { GREETING, EXAMPLES } = require('./text');

dotenv.load({path: `${__dirname}/.env`});

const luisAppId = process.env.LUIS_APP_ID;
const luisSubscriptionKey = process.env.LUIS_SUBSCRIPTION_KEY;
const port = process.env.port || process.env.PORT || 3978;
const luisServiceEndpoint = 'https://westus.api.cognitive.microsoft.com';

if (luisAppId === '<YOUR-APP-ID>') {
    throw new Error('LUIS_APP_ID not set. Please set in the .env file.');
}
if (luisSubscriptionKey === '<YOUR-SUBSCRIPTION-KEY>') {
    throw new Error('LUIS_SUBSCRIPTION_KEY not set. Please set in the .env file.');
}

const model = new LuisRecognizer({
    appId: luisAppId,
    subscriptionKey: luisSubscriptionKey,
    serviceEndpoint: luisServiceEndpoint
});

// Create server
const server = express();
server.listen(port, () => console.log(`${server.name} listening on ${port}`));

// Create adapter
const adapter = new BotFrameworkAdapter({
    appId: process.env.MICROSOFT_APP_ID,
    appPassword: process.env.MICROSOFT_APP_PASSWORD
});

// Handler for every conversation turn
const botLogic = async (context) => {
    if (context.activity.type === ActivityTypes.ConversationUpdate && context.activity.membersAdded[0].name === 'Bot') {
        // Welcome message here, bot will message you first
        await context.sendActivity(GREETING);
        await context.sendActivity(EXAMPLES);
    } else if (context.activity.type === 'message') {
        const utterance = (context.activity.text || '').trim().toLowerCase();
        console.log(`utterance: ${utterance}`);

        const luisResult = await model.recognize(context);
        const topIntent = LuisRecognizer.topIntent(luisResult);
        const topIntentScore = luisResult.intents[topIntent].score;
        const entities = [];
        for (const type in luisResult.entities) {
            const values = luisResult.entities[type]
                .map((x) => x.type === 'daterange' || x.type === 'date' ? x.timex : x);
            entities.push(`**${type}**=${values.join(', ')}`);
        }

        const response = [
            `top intent: **${topIntent || 'n/a'}**`,
            `confidence score: **${topIntentScore || 'n/a'}**`,
            `entities: ${entities.join('; ') || 'n/a'}`,
        ].join('\n');
        await context.sendActivity(response);
    }
}

// Listen for incoming requests
server.post('/api/messages', (req, res, next) => {
    adapter.processActivity(req, res, botLogic).catch((err) => {
        console.error("Sorry, something unexpected happened", err);
        next(err);
    });
});
