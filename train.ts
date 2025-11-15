import axios from 'axios'
import { JSDOM } from 'jsdom'


export async function getTimetableChanges() {
	try {
		const res = await axios.get('https://sbahn.berlin/fahren/bauen-stoerung/?filterByLine=S2&timeframetab=3')
		const dom = new JSDOM(res.data, { runScripts: 'dangerously' })
        	const document = dom.window.document


        	// general elements filtered
        	// Array.from(document.getElementsByClassName("c-constructions")[2].children).filter(x => x.attributes.getNamedItem('data-lines')?.nodeValue.match(/\bs2\b/g))

	        // on these elements map following
	        //
        	// line number
	        // x.getElementsByClassName('c-line-badge-list')[0].children[0]?.textContent
        	//
	        // station info
        	// x.getElementsByClassName('o-heading:4')[0]?.textContent
	        //
			// date info
			// Array.from(x.getElementsByClassName('o-timespan__cp')).map(t => t.textContent).toString()
			// 
	        // closer information
        	// x.getElementsByClassName('c-con-detail__effect')[0].textContent
	        //

		return Array.from(document.getElementsByClassName("c-box-list__item"))
	        .map((x: Element) => [
        	        x.getElementsByClassName('c-line-badge-list')[0].children[0]?.textContent,
                	x.getElementsByClassName('o-heading:4')[0]?.textContent,
					Array.from(x.getElementsByClassName('c-box__period')).map(t => t.textContent).toString(),
	                x.getElementsByClassName('c-con-detail__effect')[0]?.textContent
       	 	])
       
	} catch (e) {
		console.error(e)
	}
}
