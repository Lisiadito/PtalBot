process.env['NTBA_FIX_319'] = 1;
require('dotenv').config()

const TelegramBot = require('node-telegram-bot-api')
const bot = new TelegramBot(process.env.TELEGRAM_API_KEY, {polling: true})
const ical = require('node-ical')
const dayjs = require('dayjs')
const locale = require('dayjs/locale/de')
const schedule = require('node-schedule')
const fs = require('fs')

dayjs.locale(locale)

let data = ical.sync.parseFile('muellkalender.ics')
let chatID
let job
let job1
let job2
const interval = 24

/**
 * General Functions
 */


function writeChatID(id) {
    try {
        fs.writeFileSync('chatid.txt', id)
    } catch (e){
        console.error(e)
    }
}

function readChatID() {
    try {
        return fs.readFileSync('chatid.txt', {encoding: 'utf8'})
    } catch (e) {
        console.error(e, 'Please provide a chatid.txt file or restart the bot via the /start command')
    }
}

function start() {
    console.log('starting')
    if (!chatID) {
        chatID = readChatID()
    }
    if (chatID) {
        if (!job) {
            job = schedule.scheduleJob('rubbishjob', '0 7,19 * * *', sendRubbishMessage)	
        }
        if (!job1) {
            job1 = schedule.scheduleJob('rubbishjob', '0 15 * * *', ask)	
        } 
        if (!job2) {
            job2 = schedule.scheduleJob('rubbishjob', '0 18 * * *', reminder)	
        }   
    }

}

bot.onText(/\/start/, msg => {
    chatID = msg.chat.id;
    writeChatID(chatID)
	bot.sendMessage(chatID, `Bot wird neugestartet.`)	
	start()
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
        	})
        	.then(res => console.log(res))
        	.catch(err => {
        		console.trace(err)
        		start()
        		return	
        	})
        )
    } else if (!chatID){
        console.error('chatID not set')
    }
}

function checkNext(hours) {
    data = Object.values(data).filter(date => dayjs(date.start).diff(dayjs(), 'hour') >= 0)
    const messages = []
	if (data.length <= 0) {
	    return 'Kalendar enthält keine aktuellen Daten mehr. Downloade den aktuellen.'
	} else {
		data.forEach(date => {
			if (dayjs(date.start).diff(dayjs(), 'hour') <= hours) {
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
				console.trace(err)
				start()
            	return	
			})
    } else {
        console.error('chatID not set')
    }
}

function reminder() {
    if (chatID) {
		bot.sendMessage(chatID, 'Zeit zu kochen')
        	.then(res => console.log(res))
        	.catch(err => {
				console.trace(err)
				start()
            	return	
			})
    } else {
        console.error('chatID not set')
    }
}

start()
