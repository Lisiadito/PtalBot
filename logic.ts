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
