import { checkEqual, checkNext, ChatInfo } from './logic'
import { CalendarResponse } from 'node-ical'
import dayjs from 'dayjs'
import 'dayjs/locale/de'

dayjs.locale('de')

describe('checkEqual', () => {
  it('returns true for identical non-topic chats', () => {
    const a: ChatInfo = { id: 1, topic: false }
    const b: ChatInfo = { id: 1, topic: false }
    expect(checkEqual(a, b)).toBe(true)
  })

  it('returns false for different IDs', () => {
    const a: ChatInfo = { id: 1, topic: false }
    const b: ChatInfo = { id: 2, topic: false }
    expect(checkEqual(a, b)).toBe(false)
  })

  it('returns false when one is topic and the other is not', () => {
    const a: ChatInfo = { id: 1, topic: true, topic_id: 5 }
    const b: ChatInfo = { id: 1, topic: false }
    expect(checkEqual(a, b)).toBe(false)
  })

  it('returns true for same topic chat with same topic_id', () => {
    const a: ChatInfo = { id: 1, topic: true, topic_id: 5 }
    const b: ChatInfo = { id: 1, topic: true, topic_id: 5 }
    expect(checkEqual(a, b)).toBe(true)
  })

  it('returns false for same topic chat with different topic_id', () => {
    const a: ChatInfo = { id: 1, topic: true, topic_id: 5 }
    const b: ChatInfo = { id: 1, topic: true, topic_id: 6 }
    expect(checkEqual(a, b)).toBe(false)
  })

  it('ignores topic_id when both are non-topic', () => {
    const a: ChatInfo = { id: 1, topic: false, topic_id: 5 }
    const b: ChatInfo = { id: 1, topic: false, topic_id: 6 }
    expect(checkEqual(a, b)).toBe(true)
  })
})

function makeCalendar(events: Array<{ start: Date; summary: string }>): CalendarResponse {
  const cal: Record<string, any> = {}
  events.forEach((ev, i) => {
    cal[`event-${i}`] = { type: 'VEVENT', start: ev.start, summary: ev.summary }
  })
  return cal as unknown as CalendarResponse
}

describe('checkNext', () => {
  const now = dayjs('2024-06-15T10:00:00')

  it('returns message for event within time window', () => {
    const cal = makeCalendar([
      { start: new Date('2024-06-15T20:00:00'), summary: 'Meraner Strasse - Papier' },
    ])
    const result = checkNext(cal, 24, now)
    expect(result).toHaveLength(1)
    expect(result[0]).toContain('Papier')
    expect(result[0]).toContain('Müll rausbringen')
  })

  it('returns empty array for event outside window', () => {
    const cal = makeCalendar([
      { start: new Date('2024-06-17T20:00:00'), summary: 'Meraner Strasse - Restmüll' },
    ])
    const result = checkNext(cal, 24, now)
    expect(result).toEqual([])
  })

  it('filters out events in the past', () => {
    const cal = makeCalendar([
      { start: new Date('2024-06-14T08:00:00'), summary: 'Meraner Strasse - Biomüll' },
    ])
    const result = checkNext(cal, 24, now)
    expect(result).toBe('Kalendar enthält keine aktuellen Daten mehr. Downloade den aktuellen.')
  })

  it('returns only events within the window when multiple exist', () => {
    const cal = makeCalendar([
      { start: new Date('2024-06-15T18:00:00'), summary: 'Meraner Strasse - Papier' },
      { start: new Date('2024-06-20T08:00:00'), summary: 'Meraner Strasse - Restmüll' },
      { start: new Date('2024-06-15T22:00:00'), summary: 'Meraner Strasse - Biomüll' },
    ])
    const result = checkNext(cal, 24, now)
    expect(result).toHaveLength(2)
    expect(result[0]).toContain('Papier')
    expect(result[1]).toContain('Biomüll')
  })

  it('returns fallback string for empty calendar', () => {
    const cal = makeCalendar([])
    const result = checkNext(cal, 24, now)
    expect(result).toBe('Kalendar enthält keine aktuellen Daten mehr. Downloade den aktuellen.')
  })

  it('formats message with German day name and DD.MM.YYYY date', () => {
    const cal = makeCalendar([
      { start: new Date('2024-06-15T18:00:00'), summary: 'Meraner Strasse - Gelbe Tonne' },
    ])
    const result = checkNext(cal, 24, now)
    expect(result[0]).toBe('Müll rausbringen. Gelbe Tonne wird am Samstag 15.06.2024 abgeholt.')
  })
})
