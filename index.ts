require('dotenv').config()

import { Bot, InlineKeyboardMarkup } from 'node-telegram-bot-api'
import { run } from 'node-telegram-bot-api/node'
import { CalendarResponse, parseFile } from 'node-ical'
import dayjs from 'dayjs'
import locale from 'dayjs/locale/de'
import { Job, scheduleJob } from 'node-schedule'
import { readFileSync, writeFileSync } from 'fs'
import { getTimetableChanges, Consequence } from './train'
import { checkEqual, checkNext, ChatInfo, BotType, FoodChoice, FoodVotes, toggleVote, renderFoodMessage } from './logic'

const bot = new Bot(process.env.TELEGRAM_API_KEY!)
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

bot.on('callback_query', async ctx => {
  const query = ctx.callbackQuery!
  const message = query.message
  if (!message || !foodPoll || message.message_id !== foodPoll.messageId) {
    await ctx.answerCallbackQuery({ text: 'Abstimmung abgelaufen' })
    return
  }
  toggleVote(foodPoll.votes, query.from.id, query.from.first_name, query.data as FoodChoice)
  writeFoodPoll()
  try {
    await bot.api.editMessageText({
      chat_id: message.chat.id,
      message_id: message.message_id,
      text: renderFoodMessage(foodPoll.votes),
      reply_markup: foodKeyboard
    })
  } catch (err) {
    console.trace(dayjs().toString(), 'food poll edit', err)
  }
  await ctx.answerCallbackQuery()
})

bot.command('help', ctx => ctx.reply('To start the bot run `/start <PASSWORD> rubbish|food|train`'))

bot.command('start', async ctx => {
  const args = ctx.match as string
  if (!args) return
  const msg = ctx.message!
  const main_id = msg.chat.id
  const topic_id: number|undefined = msg.message_thread_id
  const topic = msg.is_topic_message || false
  const params = args.split(/\s+/)
  const pw = params[0]
  const botType = params[1] as BotType

  if (!['food', 'rubbish', 'train'].includes(botType)) {
    await bot.api.sendMessage({
      chat_id: main_id,
      text: 'Please specify if you want to start the `food` or `rubbish` or `train` bot. Command details via `/help`',
      message_thread_id: topic ? topic_id : undefined
    })
    return
  }

  if (pw === botPW) {
    writeChatID({
      id: main_id,
      topic_id: topic_id,
      topic: topic
    }, botType)

    try {
      console.log(await bot.api.sendMessage({
        chat_id: main_id,
        text: `${botType} bot wird neugestartet.`,
        message_thread_id: topic ? topic_id : undefined
      }))
    } catch (err) {
      console.trace(dayjs().toString(), 'start message', err)
    }
    start()
  } else {
    await bot.api.leaveChat({ chat_id: main_id })
    console.log(dayjs().toString(), 'leaving chat due to missing/wrong password')
  }
})

bot.command('active', async ctx => {
  const msg = ctx.message!
  const chat_info: ChatInfo = {
    id: msg.chat.id,
    topic: msg.is_topic_message || false,
    topic_id: msg.message_thread_id
  }

  if (checkEqual(food_chat_id,chat_info)) {
    await bot.api.sendMessage({
      chat_id: food_chat_id.id,
      text: 'Food bot läuft in diesem Channel',
      message_thread_id: food_chat_id.topic ? food_chat_id.topic_id : undefined
    })
  } else if (checkEqual(rubbish_chat_id, chat_info)) {
    await bot.api.sendMessage({
      chat_id: rubbish_chat_id.id,
      text: 'Rubbish bot läuft in diesem Channel',
      message_thread_id: rubbish_chat_id.topic ? rubbish_chat_id.topic_id : undefined
    })
  } else if(checkEqual(train_chat_id, chat_info)) {
    await bot.api.sendMessage({
      chat_id: train_chat_id.id,
      text: 'Train bot läuft in diesem Channel',
      message_thread_id: train_chat_id.topic ? train_chat_id.topic_id : undefined
    })
  } else {
    await ctx.reply('Bot läuft in einem anderen Channel. Um hier zu verwenden /start tippen.')
  }
})

// debugging function to check for the next 30 days
bot.command('rubbish_test', () => sendRubbishMessage(720))
bot.command('train_test', () => sendTrainMessage())
bot.command('food_test', () => ask())

// run() stops polling on SIGINT/SIGTERM; exit explicitly since the schedule jobs keep the process alive
// fatal errors (bad token, another instance polling) also stop polling: exit 1 so pm2 restarts us
run(bot).then(() => process.exit(0), err => {
  console.error(dayjs().toString(), 'polling stopped', err)
  process.exit(1)
})

/**
 * Rubbish Functions
 */

async function sendRubbishMessage(customInterval?: number) {
  const messages = checkNext(data, Number.isInteger(customInterval) ? customInterval! : interval)

  if (rubbish_chat_id && typeof messages !== 'string' && messages.length) {
    for (const message of messages) {
      try {
        console.log(await bot.api.sendMessage({
          chat_id: rubbish_chat_id.id,
          text: message,
          message_thread_id: rubbish_chat_id.topic ? rubbish_chat_id.topic_id : undefined
        }))
      } catch (err) {
        console.trace(dayjs().toString(), message, err)
        start()
      }
    }
  } else if (!rubbish_chat_id) {
    console.error(dayjs().toString(), 'rubbish_chat_id not set')
  }
}


/**
 *  Cooking Reminder Functions
 *
 */

const foodKeyboard: InlineKeyboardMarkup = {
  inline_keyboard: [[
    { text: '🍳 Ich koche', callback_data: 'cook' },
    { text: '🍽 Ich esse mit', callback_data: 'eat' },
    { text: '❌ Ohne mich', callback_data: 'out' },
  ]]
}

// today's poll is saved to food_poll.json so the buttons keep working after a deploy/restart
let foodPoll: { messageId: number, votes: FoodVotes } | undefined = readFoodPoll()

function readFoodPoll() {
  try {
    const { messageId, votes } = JSON.parse(readFileSync('food_poll.json', {encoding: 'utf8'}))
    return { messageId, votes: new Map(votes) as FoodVotes }
  } catch {
    return undefined // no poll sent yet
  }
}

function writeFoodPoll() {
  if (!foodPoll) return
  try {
    writeFileSync('food_poll.json', JSON.stringify({ messageId: foodPoll.messageId, votes: [...foodPoll.votes] }))
  } catch (e) {
    console.error(dayjs().toString(), e)
  }
}

async function ask() {
  if (food_chat_id) {
    const votes: FoodVotes = new Map()
    try {
      const res = await bot.api.sendMessage({
        chat_id: food_chat_id.id,
        text: renderFoodMessage(votes),
        message_thread_id: food_chat_id.topic ? food_chat_id.topic_id : undefined,
        reply_markup: foodKeyboard
      })
      foodPoll = { messageId: res.message_id, votes }
      writeFoodPoll()
    } catch (err) {
      console.trace(dayjs().toString(), 'food question', err)
      start()
    }
  } else {
    console.error(dayjs().toString(), 'food_chat_id not set')
  }
}

async function reminder() {
  if (food_chat_id) {
    try {
      console.log(await bot.api.sendMessage({
        chat_id: food_chat_id.id,
        text: 'Zeit zu kochen',
        message_thread_id: food_chat_id.topic ? food_chat_id.topic_id : undefined
      }))
    } catch (err) {
      console.trace(dayjs().toString(), 'time to cook message', err)
      start()
    }
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

async function sendTrainMessage() {
  const trainInfo = await getTimetableChanges()
  console.log('train chat id', train_chat_id)
  console.log('train info', trainInfo)
  if (train_chat_id && trainInfo && trainInfo.length) {
    for (const info of trainInfo) {
      try {
        console.log(await bot.api.sendMessage({
          chat_id: train_chat_id.id,
          text: formatTrainMessage(info),
          message_thread_id: train_chat_id.topic ? train_chat_id.topic_id : undefined,
          parse_mode: 'Markdown'
        }))
      } catch (err) {
        console.trace(dayjs().toString(), 'send train message error', err)
        start()
      }
    }
  } else if (!train_chat_id) {
    console.error(dayjs().toString(), 'train_chat_id not set')
  }
}
