import axios from 'axios'
import { JSDOM } from 'jsdom'


export async function getTimetableChanges() {
	try {
		const res = await axios.get('https://sbahn.berlin/fahren/bauen-stoerung/?tabs=tbc-l7')
		const dom = new JSDOM(res.data, { runScripts: 'dangerously' })
        	const document = dom.window.document


        	// general elements filtered
        	// Array.from(document.getElementsByClassName("c-constructions")[2].children).filter(x => x.attributes.getNamedItem('data-lines')?.nodeValue.includes('s2'))

	        // on these elements map following
	        //
        	// line numbers
	        // x.getElementsByClassName('c-construction-announcement-head')[0].children[0].textContent
        	//
	        // station info
        	// x.getElementsByClassName('o-construction-announcement-title')[0].children[0].textContent
	        //
			// date info
			// x.getElementsByClassName('o-timespan__cp')[0].textContent
			// 
	        // closer information
        	// x.getElementsByClassName('c-list-unordered')[0].children[0].textContent
	        //
        
		return Array.from(document.getElementsByClassName("c-constructions")[2].children).filter((x: any) => x.attributes.getNamedItem('data-lines')?.nodeValue.includes('s2'))
	        .map((x: any) => [
        	        x.getElementsByClassName('c-construction-announcement-head')[0].children[0].textContent,
                	x.getElementsByClassName('o-construction-announcement-title')[0].children[0].textContent,
					x.getElementsByClassName('o-timespan__cp')[0].textContent,
	                x.getElementsByClassName('c-list-unordered')[0].children[0].textContent
       	 	])
       
	} catch (e) {
		console.error(e)
	}
}
