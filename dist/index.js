"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
process.env['NTBA_FIX_319'] = String(1);
require('dotenv').config();
const TelegramBot = require("node-telegram-bot-api");
const node_ical_1 = require("node-ical");
const dayjs = require("dayjs");
const de_1 = require("dayjs/locale/de");
const node_schedule_1 = require("node-schedule");
const fs_1 = require("fs");
const bot = new TelegramBot(process.env.TELEGRAM_API_KEY, { polling: true });
const botPW = process.env.BOTPW;
dayjs.locale(de_1.default);
let data;
let tmpData;
let chatID;
let job;
let job1;
let job2;
const interval = 24;
try {
    data = (0, node_ical_1.parseFile)('muellkalender.ics');
    start();
}
catch (e) {
    console.error(dayjs().toString(), e, "could not read calendar file");
}
/**
 * General Functions
 */
function writeChatID(id) {
    try {
        (0, fs_1.writeFileSync)('chatid.txt', `${id}`);
    }
    catch (e) {
        console.error(dayjs().toString(), e);
    }
}
function readChatID() {
    try {
        return (0, fs_1.readFileSync)('chatid.txt', { encoding: 'utf8' });
    }
    catch (e) {
        console.error(dayjs().toString(), e, 'Please provide a chatid.txt file or restart the bot via the /start command');
    }
}
function start() {
    console.log('starting');
    if (!chatID) {
        chatID = readChatID();
    }
    if (chatID) {
        if (!job) {
            job = (0, node_schedule_1.scheduleJob)('rubbishjob', '0 7,19 * * *', sendRubbishMessage);
        }
        if (!job1) {
            job1 = (0, node_schedule_1.scheduleJob)('ask', '0 11 * * *', ask);
        }
        if (!job2) {
            //job2 = scheduleJob('reminder', '0 18 * * *', reminder)
        }
    }
}
bot.onText(/\/start (.+)/, (msg, match) => {
    chatID = msg.chat.id;
    const pw = match[1];
    if (pw === botPW) {
        writeChatID(chatID);
        bot.sendMessage(chatID, `Bot wird neugestartet.`)
            .then(res => console.log(res))
            .catch(err => {
            console.trace(dayjs().toString(), 'start message', err);
        });
        start();
    }
    else {
        bot.leaveChat(chatID)
            .then(() => {
            console.log(dayjs().toString(), 'leaving chat due to missing/wrong password');
        })
            .catch(e => {
            console.error(dayjs().toString(), e);
        });
    }
});
bot.onText(/\/active/, msg => {
    msg.chat.id === chatID ? bot.sendMessage(chatID, 'Bot läuft in diesem Channel') : bot.sendMessage(msg.chat.id, 'Bot läuft in einem anderen Channel. Um hier zu verwenden /start tippen.');
});
bot.onText(/\/rubbish_test/, msg => {
    // debugging function to check for the next 30 days
    sendRubbishMessage(720);
});
/**
 * Rubbish Functions
 */
function sendRubbishMessage(customInterval) {
    let messages;
    if (Number.isInteger(customInterval)) {
        messages = checkNext(customInterval);
    }
    else {
        messages = checkNext(interval);
    }
    if (chatID && messages.length) {
        messages.forEach(message => {
            bot.sendMessage(chatID, message)
                .then(res => console.log(res))
                .catch(err => {
                console.trace(dayjs().toString(), message, err);
                start();
            });
        });
    }
    else if (!chatID) {
        console.error(dayjs().toString(), 'chatID not set');
    }
}
function checkNext(hours) {
    tmpData = Object.values(data).filter((date) => dayjs(date.start).diff(dayjs(), 'hour') >= 0);
    const messages = [];
    if (tmpData.length <= 0) {
        return 'Kalendar enthält keine aktuellen Daten mehr. Downloade den aktuellen.';
    }
    else {
        tmpData.forEach(date => {
            if (date.start && dayjs(date.start).diff(dayjs(), 'hour') <= hours) {
                messages.push(`Müll rausbringen. ${date.summary.match(/- (.*)/)[1]} wird am ${dayjs(date.start).format('dddd DD.MM.YYYY')} abgeholt.`);
            }
        });
        return messages;
    }
}
/**
 *  Cooking Reminder Functions
 *
 */
function ask() {
    if (chatID) {
        bot.sendMessage(chatID, 'Kocht heute jemand?')
            .then(res => console.log(res))
            .catch(err => {
            console.trace(dayjs().toString(), 'who cooks question', err);
            start();
        });
    }
    else {
        console.error(dayjs().toString(), 'chatID not set');
    }
}
function reminder() {
    if (chatID) {
        bot.sendMessage(chatID, 'Zeit zu kochen')
            .then(res => console.log(res))
            .catch(err => {
            console.trace(dayjs().toString(), 'time to cook message', err);
            start();
        });
    }
    else {
        console.error(dayjs().toString(), 'chatID not set');
    }
}
//# sourceMappingURL=index.js.map