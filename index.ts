process.env['NTBA_FIX_319'] = String(1)
require('dotenv').config()

import * as TelegramBot from 'node-telegram-bot-api'
import { CalendarResponse, VEvent, parseFile } from 'node-ical'
import * as dayjs from 'dayjs'
import locale from 'dayjs/locale/de'
import {Job, scheduleJob} from 'node-schedule'
import { readFileSync, writeFileSync } from 'fs'

const bot = new TelegramBot(process.env.TELEGRAM_API_KEY, {polling: true})
const botPW: string = process.env.BOTPW

dayjs.locale(locale)

let data: CalendarResponse
let tmpData
let chatID
let job: Job
let job1: Job
let job2: Job
const interval = 24

try {
  data = parseFile('muellkalender.ics')
  start()
} catch (e) {
  console.error(dayjs().toString(), e, "could not read calendar file")
}

/**
 * General Functions
 */


function writeChatID(id) {
  try {
    writeFileSync('chatid.txt', `${id}`)
  } catch (e) {
    console.error(dayjs().toString(), e)
  }
}

function readChatID() {
  try {
    return readFileSync('chatid.txt', {encoding: 'utf8'})
  } catch (e) {
    console.error(dayjs().toString(), e, 'Please provide a chatid.txt file or restart the bot via the /start command')
  }
}

function start() {
  console.log('starting')
  if (!chatID) {
    chatID = readChatID()
  }
  if (chatID) {
    if (!job) {
      job = scheduleJob('rubbishjob', '0 7,19 * * *', sendRubbishMessage)
    }
    if (!job1) {
      job1 = scheduleJob('ask', '0 15 * * *', ask)
    }
    if (!job2) {
      job2 = scheduleJob('reminder', '0 18 * * *', reminder)
    }
  }

}

bot.onText(/\/start (.+)/, (msg, match) => {
  chatID = msg.chat.id
  const pw = match[1]

  if (pw === botPW) {
    writeChatID(chatID)
    bot.sendMessage(chatID, `Bot wird neugestartet.`)
        .then(res => console.log(res))
        .catch(err => {
          console.trace(dayjs().toString(), 'start message', err)
        })
    start()
  } else {
    bot.leaveChat(chatID)
        .then(() => {
          console.log(dayjs().toString(), 'leaving chat due to missing/wrong password')
        })
        .catch(e => {
          console.error(dayjs().toString(), e)
        })
  }


})

bot.onText(/\/active/, msg => {
  msg.chat.id === chatID ? bot.sendMessage(chatID, 'Bot läuft in diesem Channel') : bot.sendMessage(msg.chat.id, 'Bot läuft in einem anderen Channel. Um hier zu verwenden /start tippen.')
})

bot.onText(/\/rubbish_test/, msg => {
  // debugging function to check for the next 30 days
  sendRubbishMessage(720)
})

/**
 * Rubbish Functions
 */

function sendRubbishMessage(customInterval) {
  let messages

  if (Number.isInteger(customInterval)) {
    messages = checkNext(customInterval)
  } else {
    messages = checkNext(interval)
  }

  if (chatID && messages.length) {
    messages.forEach(message => {
      bot.sendMessage(chatID, message)
        .then(res => console.log(res))
        .catch(err => {
          console.trace(dayjs().toString(), message, err)
          start()
        })
    })
  } else if (!chatID) {
    console.error(dayjs().toString(), 'chatID not set')
  }
}

function checkNext(hours) {
  tmpData = Object.values(data).filter((date: VEvent) => dayjs(date.start).diff(dayjs(), 'hour') >= 0)
  const messages = []
  if (tmpData.length <= 0) {
    return 'Kalendar enthält keine aktuellen Daten mehr. Downloade den aktuellen.'
  } else {
    tmpData.forEach(date => {
      if (date.start && dayjs(date.start).diff(dayjs(), 'hour') <= hours) {
        messages.push(`Müll rausbringen. ${date.summary.match(/- (.*)/)[1]} wird am ${dayjs(date.start).format('dddd DD.MM.YYYY')} abgeholt.`)
      }
    })
    return messages
  }
}

/**
 *  Cooking Reminder Functions
 *
 */

function ask() {
  if (chatID) {
    bot.sendMessage(chatID, 'Wer kocht heute?')
      .then(res => console.log(res))
      .catch(err => {
        console.trace(dayjs().toString(), 'who cooks question', err)
        start()
      })
  } else {
    console.error(dayjs().toString(), 'chatID not set')
  }
}

function reminder() {
  if (chatID) {
    bot.sendMessage(chatID, 'Zeit zu kochen')
      .then(res => console.log(res))
      .catch(err => {
        console.trace(dayjs().toString(), 'time to cook message', err)
        start()
      })
  } else {
    console.error(dayjs().toString(), 'chatID not set')
  }
}
