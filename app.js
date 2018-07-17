// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

const express = require('express')
const { BotFrameworkAdapter, ActivityTypes } = require('botbuilder');
const { LuisRecognizer } = require('botbuilder-ai');

const { GREETING, EXAMPLES } = require('./text');

const luisAppId = '1f3f8db7-5f52-45d2-b92b-b429e5b59c4d';
const luisSubscriptionKey = '391d355fa11641e4bb6a34d65372f577';
const port = process.env.port || process.env.PORT || 3978;
const luisServiceEndpoint = 'https://westus.api.cognitive.microsoft.com';

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

// Proceesor for every conversation turn
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
        const entities = Object.values(luisResult.entities)
            .map((x) => x[0])
            .map((x) => x.type === 'daterange' || x.type === 'date' ? x.timex[0] : x);
        console.log(`entities: ${entities}`);

        const response = [
            `top intent: **${topIntent || 'n/a'}**`,
            `confidence score: **${topIntentScore || 'n/a'}**`,
            `entities: **${entities.join(', ') || 'n/a'}**`,
        ].join('\n');
        await context.sendActivity(response);
    }
}

// Listen for incoming requests
server.post('/api/messages', (req, res, next) => {
    adapter.processActivity(req, res, botLogic).catch(next);
});
