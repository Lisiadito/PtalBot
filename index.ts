process.env['NTBA_FIX_319'] = String(1)
require('dotenv').config()

import TelegramBot from 'node-telegram-bot-api'
import { CalendarResponse, parseFile } from 'node-ical'
import dayjs from 'dayjs'
import locale from 'dayjs/locale/de'
import { Job, scheduleJob } from 'node-schedule'
import { readFileSync, writeFileSync } from 'fs'
import { getTimetableChanges, Consequence } from './train'
import { checkEqual, checkNext, ChatInfo, BotType } from './logic'

const bot = new TelegramBot(process.env.TELEGRAM_API_KEY!, {polling: true})
const botPW = process.env.BOTPW!

dayjs.locale(locale)

let data: CalendarResponse
let rubbish_chat_id: ChatInfo
let food_chat_id: ChatInfo
let train_chat_id: ChatInfo
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

function writeChatID(id: ChatInfo, type: BotType) {
  try {
    writeFileSync(`${type}_id.json`, JSON.stringify(id))
  } catch (e) {
    console.error(dayjs().toString(), e)
  }
}

function readChatID(type: BotType): ChatInfo {
  try {
    const json_string = readFileSync(`${type}_id.json`, {encoding: 'utf8'})
    if (json_string.length) {
      return JSON.parse(json_string)
    }
  } catch (e) {
    console.error(dayjs().toString(), e, `Please provide a ${type}_id.json file or restart the bot via the /start command`)
  }
  return {} as ChatInfo
}

function start() {
  console.log('starting')
  if (!food_chat_id || !rubbish_chat_id) {
    food_chat_id = readChatID('food')
    rubbish_chat_id = readChatID('rubbish')
    train_chat_id = readChatID('train')
  }
  if (food_chat_id.id) {
    if (!job1) {
      job1 = scheduleJob('ask', '0 11 * * *', ask)
    }
    // if (!job2) {
      //job2 = scheduleJob('reminder', '0 18 * * *', reminder)
    // }
  }
  
  if (rubbish_chat_id.id) {
    if (!job) {
      job = scheduleJob('rubbishjob', '0 7,19 * * *', () => sendRubbishMessage())
    }
  }

  if (train_chat_id.id) {
    if (!job2) {
      job2 = scheduleJob('trainjob', '0 0 * * 0', sendTrainMessage)
    }
  }
}

bot.onText(/\/help/, (msg)  => {
  bot.sendMessage(msg.chat.id, 'To start the bot run `/start <PASSWORD> rubbish|food|train`')
})

bot.onText(/\/start (.+)/, (msg, match: RegExpExecArray | null) => {
  if (!match) return
  const main_id = msg.chat.id
  const topic_id: number|undefined = msg.message_thread_id
  const topic = msg.is_topic_message || false
  const params = match[1].split(/\s+/)
  const pw = params[0]
  const botType = params[1] as BotType

  if (!['food', 'rubbish', 'train'].includes(botType)) {
    bot.sendMessage(main_id, 'Please specify if you want to start the `food` or `rubbish` or `train` bot. Command details via `/help`', {
      reply_to_message_id: topic ? topic_id : undefined
    })
    return
  }

  if (pw === botPW) {
    writeChatID({
      id: main_id,
      topic_id: topic_id,
      topic: topic
    }, botType)

    bot.sendMessage(main_id, `${botType} bot wird neugestartet.`, {
      reply_to_message_id: topic ? topic_id : undefined
    })
        .then(res => console.log(res))
        .catch(err => {
          console.trace(dayjs().toString(), 'start message', err)
        })
    start()
  } else {

    bot.leaveChat(main_id)
        .then(() => {
          console.log(dayjs().toString(), 'leaving chat due to missing/wrong password')
        })
        .catch(e => {
          console.error(dayjs().toString(), e)
        })
  }
})

bot.onText(/\/active/, msg => {
  const chat_info: ChatInfo = {
    id: msg.chat.id,
    topic: msg.is_topic_message || false,
    topic_id: msg.message_thread_id
  }

  if (checkEqual(food_chat_id,chat_info)) {
    bot.sendMessage(food_chat_id.id, 'Food bot läuft in diesem Channel', {
      reply_to_message_id: food_chat_id.topic ? food_chat_id.topic_id : undefined
    })
  } else if (checkEqual(rubbish_chat_id, chat_info)) {
    bot.sendMessage(rubbish_chat_id.id, 'Rubbish bot läuft in diesem Channel', {
      reply_to_message_id: rubbish_chat_id.topic ? rubbish_chat_id.topic_id : undefined
    })
  } else if(checkEqual(train_chat_id, chat_info)) {
    bot.sendMessage(train_chat_id.id, 'Train bot läuft in diesem Channel', {
      reply_to_message_id: train_chat_id.topic ? train_chat_id.topic_id : undefined
    })
  } else {
    bot.sendMessage(msg.chat.id, 'Bot läuft in einem anderen Channel. Um hier zu verwenden /start tippen.')
  }
})

bot.onText(/\/rubbish_test/, msg => {
  // debugging function to check for the next 30 days
  sendRubbishMessage(720)
})

bot.onText(/\/train_test/, msg => {
  sendTrainMessage()
})

/**
 * Rubbish Functions
 */

function sendRubbishMessage(customInterval?: number) {
  const messages = checkNext(data, Number.isInteger(customInterval) ? customInterval! : interval)

  if (rubbish_chat_id && typeof messages !== 'string' && messages.length) {
    messages.forEach((message: string) => {
      bot.sendMessage(rubbish_chat_id.id, message, {
        reply_to_message_id: rubbish_chat_id.topic ? rubbish_chat_id.topic_id : undefined
      })
        .then(res => console.log(res))
        .catch(err => {
          console.trace(dayjs().toString(), message, err)
          start()
        })
    })
  } else if (!rubbish_chat_id) {
    console.error(dayjs().toString(), 'rubbish_chat_id not set')
  }
}


/**
 *  Cooking Reminder Functions
 *
 */

function ask() {
  if (food_chat_id) {
    bot.sendMessage(food_chat_id.id, 'Kocht heute jemand?', {
      reply_to_message_id: food_chat_id.topic ? food_chat_id.topic_id : undefined
    })
    .then(res => console.log(res))
    .catch(err => {
      console.trace(dayjs().toString(), 'who cooks question', err)
      start()
    })

    bot.sendMessage(food_chat_id.id, 'Wer würde heute abend mitessen?', {
      reply_to_message_id: food_chat_id.topic ? food_chat_id.topic_id : undefined
    })
    .then(res => console.log(res))
    .catch(err => {
      console.trace(dayjs().toString(), 'who wants food question', err)
      start()
    })
  } else {
    console.error(dayjs().toString(), 'food_chat_id not set')
  }
}

function reminder() {
  if (food_chat_id) {
    bot.sendMessage(food_chat_id.id, 'Zeit zu kochen', {
      reply_to_message_id: food_chat_id.topic ? food_chat_id.topic_id : undefined
    })
      .then(res => console.log(res))
      .catch(err => {
        console.trace(dayjs().toString(), 'time to cook message', err)
        start()
      })
  } else {
    console.error(dayjs().toString(), 'food_chat_id not set')
  }
}


/*
* Train function
*/

const EFFECT_LABELS: Record<string, string> = {
  REPLACEMENT: 'Ersatzverkehr',
  NO_SERVICE: 'Kein Zugverkehr',
  NO_STOP: 'Kein Halt',
  TACT_CHANGE: 'Fahrplanänderung',
  TRAIN_SERVICE_CHANGED: 'Geänderter Zugverkehr',
  SHUTTLE_SERVICE: 'Pendelverkehr',
  SPECIAL: 'Sonstige Einschränkungen',
}

function formatTrainMessage(c: Consequence): string {
  const lines = c.lines.join(', ')
  const periods = c.periods.join('\n')
  const effect = EFFECT_LABELS[c.effect] ?? c.effect
  let msg = `${lines} \n *${c.title}* \n _${periods}_ \n\n ${effect}`
  if (c.subline) msg += `\n\n${c.subline}`
  return msg
}

function sendTrainMessage() {
  getTimetableChanges().then(trainInfo => {
    console.log('train chat id', train_chat_id)
    console.log('train info', trainInfo)
    if (train_chat_id && trainInfo && trainInfo.length) {
      trainInfo.forEach(info => {
        const message = formatTrainMessage(info)

        bot.sendMessage(train_chat_id.id, message, {
          reply_to_message_id: train_chat_id.topic ? train_chat_id.topic_id : undefined,
          parse_mode: 'Markdown'
        })
          .then(res => console.log(res))
          .catch(err => {
            console.trace(dayjs().toString(), 'send train message error', err)
            start()
          })
      })
    } else if (!train_chat_id) {
      console.error(dayjs().toString(), 'train_chat_id not set')
    }
  })
}
