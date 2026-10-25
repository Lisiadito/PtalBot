import { CalendarResponse, VEvent } from 'node-ical'
import dayjs from 'dayjs'
import locale from 'dayjs/locale/de'

dayjs.locale(locale)

export interface ChatInfo {
  id: number
  topic_id?: number
  topic: boolean
}

export type BotType = 'food' | 'rubbish' | 'train'

export function checkEqual(a: ChatInfo, b: ChatInfo): boolean {
  return a.id === b.id && a.topic === b.topic && ((a.topic && b.topic && a.topic_id === b.topic_id) || a.topic === false && b.topic === false);
}

export function checkNext(data: CalendarResponse, hours: number, now?: dayjs.Dayjs): string | string[] {
  const currentTime = now || dayjs()
  const events = Object.values(data).filter((entry): entry is VEvent =>
    (entry as VEvent).start !== undefined && dayjs((entry as VEvent).start).diff(currentTime, 'hour') >= 0
  )
  const messages: string[] = []
  if (events.length <= 0) {
    return 'Kalendar enthält keine aktuellen Daten mehr. Downloade den aktuellen.'
  } else {
    events.forEach(date => {
      if (dayjs(date.start).diff(currentTime, 'hour') <= hours) {
        const summary = typeof date.summary === 'string' ? date.summary : date.summary.val
        messages.push(`Müll rausbringen. ${summary.match(/- (.*)/)![1]} wird am ${dayjs(date.start).format('dddd DD.MM.YYYY')} abgeholt.`)
      }
    })
    return messages
  }
}

export type FoodChoice = 'cook' | 'eat' | 'out'
export type FoodVotes = Map<number, { name: string, choice: FoodChoice }>

// tapping your current choice again clears it
export function toggleVote(votes: FoodVotes, userId: number, name: string, choice: FoodChoice) {
  if (votes.get(userId)?.choice === choice) votes.delete(userId)
  else votes.set(userId, { name, choice })
}

export function renderFoodMessage(votes: FoodVotes): string {
  const names = (choice: FoodChoice) => [...votes.values()].filter(v => v.choice === choice).map(v => v.name)
  const cooks = names('cook'), eaters = names('eat'), out = names('out')
  const portions = cooks.length + eaters.length
  let msg = 'Wer kocht / isst heute?'
  if (cooks.length) msg += `\n🍳 Kocht: ${cooks.join(', ')}`
  if (eaters.length) msg += `\n🍽 Isst mit: ${eaters.join(', ')}`
  if (out.length) msg += `\n❌ Ohne: ${out.join(', ')}`
  if (portions) msg += `\n\n${portions} Portion${portions > 1 ? 'en' : ''}`
  return msg
}
