import axios from 'axios'
import { getTimetableChanges } from './train'

jest.mock('axios')
const mockedAxios = axios as jest.Mocked<typeof axios>

const soonDate = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString()
const farDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()

const makeConsequence = (overrides: Record<string, any> = {}) => ({
  id: '1',
  type: 'CONSTRUCTION_ACTIVITY',
  effect: 'REPLACEMENT',
  title: 'Blankenfelde <> Priesterweg',
  subline: '<ol><li data-list="bullet"><strong>Kein S-Bahnverkehr</strong> zwischen A und B</li></ol>',
  periods: [{ title: 'soon period', dateStart: soonDate }],
  lines: [{ title: 'S2' }],
  ...overrides,
})

const makeResponse = (consequences: any[]) => ({
  data: { data: { consequences } }
})

describe('getTimetableChanges', () => {
  afterEach(() => jest.resetAllMocks())

  it('parses a single S2 consequence', async () => {
    mockedAxios.post.mockResolvedValue(makeResponse([makeConsequence()]))
    const result = await getTimetableChanges()
    expect(result).toHaveLength(1)
    expect(result[0].title).toBe('Blankenfelde <> Priesterweg')
    expect(result[0].effect).toBe('REPLACEMENT')
    expect(result[0].subline).toBe('• Kein S-Bahnverkehr zwischen A und B')
    expect(result[0].periods).toEqual(['soon period'])
    expect(result[0].lines).toEqual(['S2'])
  })

  it('filters out non-S2 consequences', async () => {
    mockedAxios.post.mockResolvedValue(makeResponse([
      makeConsequence(),
      makeConsequence({ id: '2', title: 'Other', lines: [{ title: 'S1' }] }),
      makeConsequence({ id: '3', title: 'Multi', lines: [{ title: 'S2' }, { title: 'S25' }] }),
    ]))
    const result = await getTimetableChanges()
    expect(result).toHaveLength(2)
    expect(result[0].title).toBe('Blankenfelde <> Priesterweg')
    expect(result[1].title).toBe('Multi')
  })

  it('filters out minor effects (non-Erhebliche Einschränkungen)', async () => {
    mockedAxios.post.mockResolvedValue(makeResponse([
      makeConsequence({ effect: 'REPLACEMENT' }),
      makeConsequence({ id: '2', title: 'Minor change', effect: 'TRAIN_SERVICE_CHANGED' }),
      makeConsequence({ id: '3', title: 'Special', effect: 'SPECIAL' }),
      makeConsequence({ id: '4', title: 'No service', effect: 'NO_SERVICE' }),
    ]))
    const result = await getTimetableChanges()
    expect(result).toHaveLength(2)
    expect(result[0].effect).toBe('REPLACEMENT')
    expect(result[1].effect).toBe('NO_SERVICE')
  })

  it('filters out consequences starting more than 14 days from now', async () => {
    mockedAxios.post.mockResolvedValue(makeResponse([
      makeConsequence(),
      makeConsequence({ id: '2', title: 'Far away', periods: [{ title: 'far period', dateStart: farDate }] }),
    ]))
    const result = await getTimetableChanges()
    expect(result).toHaveLength(1)
    expect(result[0].title).toBe('Blankenfelde <> Priesterweg')
  })

  it('drops far-out periods but keeps nearby ones on the same consequence', async () => {
    mockedAxios.post.mockResolvedValue(makeResponse([
      makeConsequence({ periods: [
        { title: 'soon', dateStart: soonDate },
        { title: 'far', dateStart: farDate },
      ]}),
    ]))
    const result = await getTimetableChanges()
    expect(result).toHaveLength(1)
    expect(result[0].periods).toEqual(['soon'])
  })

  it('returns empty array when no S2 consequences', async () => {
    mockedAxios.post.mockResolvedValue(makeResponse([
      makeConsequence({ lines: [{ title: 'S1' }] }),
    ]))
    const result = await getTimetableChanges()
    expect(result).toEqual([])
  })

  it('returns empty array when API returns no consequences', async () => {
    mockedAxios.post.mockResolvedValue(makeResponse([]))
    const result = await getTimetableChanges()
    expect(result).toEqual([])
  })

  it('returns undefined on network error', async () => {
    mockedAxios.post.mockRejectedValue(new Error('Network Error'))
    const result = await getTimetableChanges()
    expect(result).toBeUndefined()
  })
})
