import axios from 'axios'

const API_URL = 'https://api.sbahn.berlin/construction-api/query'

const FOURTEEN_DAYS_MS = 14 * 24 * 60 * 60 * 1000

const QUERY = `
query Consequences($language: Language!) {
    consequences(language: $language) {
        id
        type
        effect
        title
        subline
        periods {
            title
            dateStart
        }
        lines {
            title
        }
    }
}`

const MAJOR_EFFECTS = ['REPLACEMENT', 'SHUTTLE_SERVICE', 'TACT_CHANGE', 'NO_SERVICE', 'NO_STOP']

export interface Consequence {
	title: string
	effect: string
	type: string
	subline: string
	periods: string[]
	lines: string[]
}

function stripHtml(html: string): string {
	return html
		.replace(/<li[^>]*>/g, '• ')
		.replace(/<\/li>/g, '\n')
		.replace(/<[^>]+>/g, '')
		.replace(/&lt;/g, '<')
		.replace(/&gt;/g, '>')
		.replace(/&amp;/g, '&')
		.replace(/\n{2,}/g, '\n')
		.trim()
}

export async function getTimetableChanges(): Promise<Consequence[] | undefined> {
	try {
		const res = await axios.post(API_URL, {
			query: QUERY,
			variables: { language: 'GERMAN' }
		}, {
			headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' }
		})

		const consequences = res.data?.data?.consequences ?? []

		const cutoff = Date.now() + FOURTEEN_DAYS_MS

		return consequences
			.filter((c: any) => c.lines.some((l: any) => l.title === 'S2'))
			.filter((c: any) => MAJOR_EFFECTS.includes(c.effect))
			.filter((c: any) => c.periods.some((p: any) => new Date(p.dateStart).getTime() <= cutoff))
			.map((c: any): Consequence => ({
				title: c.title,
				effect: c.effect,
				type: c.type,
				subline: c.subline ? stripHtml(c.subline) : '',
				periods: c.periods.filter((p: any) => new Date(p.dateStart).getTime() <= cutoff).map((p: any) => p.title),
				lines: c.lines.map((l: any) => l.title),
			}))
	} catch (e) {
		console.error(e)
	}
}
