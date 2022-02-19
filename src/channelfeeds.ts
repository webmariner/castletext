import moment from 'moment';
import axios from 'axios';
import { Buffer } from 'buffer';
import { GeneratedPage, Page, PageTemplate } from './page';
import * as format from './format';
import codes from './teletext_codes.json';
import channelPageConfig from './channel_pages.json';

class TVHListingsPage extends GeneratedPage {
    channelId:string;

    constructor(pageNumber:string, parent:Page, template:PageTemplate, name:string, channelId:string) {
        super(pageNumber, parent, template, name);
        this.channelId = channelId;
    }

    generateContent() {
        this.lines.length = 0;
		const now = new Date();
		const from = moment();
		const to = moment().add(1, 'days');
		console.log(`Fetching TV guide for ${this.name} from ${from.format('ddd HH:mm')} to ${to.format('ddd HH:mm')}`);
		let data = `channel=${this.channelId}&filter=[{"field":"end","type":"numeric","value":${from.unix()},"comparison":"gt"},`;
		data += `{"field":"start","type":"numeric","value":${to.unix()},"comparison":"lt"}]`;
		axios.post(channelPageConfig.tvhBaseUrl + '/api/epg/events/grid', data, {
			headers: {
				'Authorization': `Basic ${Buffer.from(channelPageConfig.credentials).toString('base64')}`,
				'Content-Type': 'application/x-www-form-urlencoded',
				'Content-Length': data.length
			}
		}).then((response) => {
			console.log(`Got TVH result for ${this.name}`);
			const contentLines = [];
			let currentDay = from.day();
			for (let programme of response.data.entries) {
				const programmeStartTime = moment.unix(programme.start);
				const titleLines = format.getLines(programme.title.toUpperCase(), 34, 3, format.Justification.Left);
				let timeShown = false;
				if (currentDay !== programmeStartTime.day()) {
					titleLines.forEach((line, index) => {
						switch (index) {
							case 0:
								this.addContentLine(codes.TEXT_GREEN + programmeStartTime.format('ddd ') + codes.TEXT_YELLOW + line);
								break;
							case 1:
								this.addContentLine(codes.TEXT_GREEN + programmeStartTime.format('HHmm') + codes.TEXT_YELLOW + line);
								timeShown = true;
								break;
							default:
								this.addContentLine(codes.TEXT_GREEN + '    ' + codes.TEXT_YELLOW + line);
						}
					});
				} else {
					titleLines.forEach((line, index) => {
						this.addContentLine(codes.TEXT_GREEN + 
							(index === 0 ? programmeStartTime.format('HHmm') : '    ') +
							codes.TEXT_YELLOW + line);
					});
					timeShown = true;
				}
				const subTitleLines = format.getLines(programme.subtitle, 34, 6, format.Justification.Left);
				for (let line of subTitleLines) {
					if (timeShown) {
						this.addContentLine(codes.TEXT_WHITE + '     ' + line);
					} else {
						this.addContentLine(codes.TEXT_GREEN + programmeStartTime.format('HHmm') + codes.TEXT_WHITE + line);
						timeShown = true;
					}
				}
				const summaryLines = format.getLines(programme.summary, 34, 10, format.Justification.Left);
				for (let line of summaryLines) {
					if (timeShown) {
						this.addContentLine('     ' + codes.TEXT_CYAN + line);
					} else {
						this.addContentLine(codes.TEXT_GREEN + programmeStartTime.format('HHmm') + codes.TEXT_CYAN + line);
						timeShown = true;
					}
				}
			}
		}).catch((error) => {
			console.log(`Problem fetching ${this.name}: ${error}`);
			console.log(error.request);
		});
    }
}

// Until we figure out how to access other pages and whether to wire them using a parent attribute in the config files, hardcode a listings
// section home page for now...
const sectionParent:Page = new Page('300', 'TV & Radio menu');

const channelPages:[TVHListingsPage] = channelPageConfig.channels.map(channelConfig => {
    const template = channelConfig.masthead ?
        new PageTemplate(channelConfig.name, channelConfig.masthead, codes.TEXT_BLUE + codes.NEW_BACKGRD + codes.TEXT_CYAN) :
        new PageTemplate(channelConfig.name);
    return new TVHListingsPage(channelConfig.number, sectionParent, template, channelConfig.name, channelConfig.tvhChannel);
}) as [TVHListingsPage];

let registerPage = (page: Page) => {
    console.log('Not available yet');
}

const fetchListings = (callback:(page:Page) => void) => {
    registerPage = callback;
    console.log('Fetching programme listings...');
    channelPages.forEach((channelPage) => {
        channelPage.generateContent();
        registerPage(channelPage);
    });
};

export {
    fetchListings
}
