import axios from 'axios';
import moment from 'moment';
import { transcodeUtf8ToBeeb } from './format';
import { Page, GeneratedPage, PageTemplate } from './page';
import * as format from './format';
import codes from './teletext_codes.json';

const venueListMasthead = "\u0014\u001d\u0015 < \u0007Talks & Workshops                \u0014\u001d\u0017x}0\u0005Venues A-Z                       \u0014\u001d\u0017\u007fk5                                  ";
const footerPrefix = "\u0014\u001d\u0007";

let schedule = [];
let venues = [];
let eventsByVenue = {};


/**
 * compareStart(a, b)
 * Function to compare the start dates of two EMFCamp events
 * in a way that makes sense to Array.prototype.sort().
 * returns: negative number if a starts before b, zero if
 * a and b start at the same time, and a positive number if
 * a starts after b.
 */
const compareStart = (a, b) => {
    const aStart = new Date(a.start_date);
    const bStart = new Date(b.start_date);
    return aStart.valueOf() - bStart.valueOf();
};

const sectionParent:Page = new Page('100', 'EMF main menu');
const venuesTemplate:PageTemplate = new PageTemplate('Talk & Workshop venues', venueListMasthead, footerPrefix);

const handleSchedule = () => {
    venues = [];
    eventsByVenue = {};
    let currentDay = moment().day();
    schedule.sort(compareStart).forEach(event => {
        if (!venues.includes(event.venue)) {
            venues.push(event.venue);
        }
        if (!eventsByVenue[event.venue]) {
            eventsByVenue[event.venue] = [];
        }
        eventsByVenue[event.venue].push(event);
    });
    venues = venues.sort();
    let venuePageNumber = 200;
    const venueListPage = new GeneratedPage(venuePageNumber.toString(10), sectionParent, venuesTemplate, 'Talk & Workshop venues');
    venues.forEach(venue => {
        venuePageNumber++;
        let venueNameDisplay = format.getLines(venue, 35, 1, format.Justification.Left)[0];
        venueListPage.addContentLine(codes.TEXT_YELLOW + venuePageNumber.toString(10) + codes.TEXT_WHITE + venueNameDisplay);
        const events = eventsByVenue[venue];
        console.log(`${venue} has ${events.length} events`);
        const venueLines = format.getLines(venue, 33, 2, format.Justification.Left);
        if (venueLines.length === 1) {
            venueLines.push(''.padEnd(33));
        }
        const venueMasthead = `\u0014\u001d\u0015 < \u0007Talks & Workshops                \u0014\u001d\u0017x}0\u0005${venueLines[0]}\u0014\u001d\u0017\u007fk5\u0005${venueLines[1]}`;
        const venueTemplate:PageTemplate = new PageTemplate(venueNameDisplay, venueMasthead, footerPrefix);
        const venuePage = new GeneratedPage(venuePageNumber.toString(10), venueListPage, venueTemplate,
            format.getLines(venue, 34, 1, format.Justification.Left)[0]);
        events.forEach(event => {
            //console.log(`    ${event.start_date}  ${event.end_date} ${event.title}`);
            const eventStartTime = moment(event.start_date);
            const titleLines = format.getLines(event.title.toUpperCase(), 34, 3, format.Justification.Left);
            let timeShown = false;
            if (currentDay !== eventStartTime.day()) {
                titleLines.forEach((line, index) => {
                    switch (index) {
                        case 0:
                            venuePage.addContentLine(codes.TEXT_GREEN + eventStartTime.format('ddd ') + codes.TEXT_YELLOW + line);
                            break;
                        case 1:
                            venuePage.addContentLine(codes.TEXT_GREEN + eventStartTime.format('HHmm') + codes.TEXT_YELLOW + line);
                            timeShown = true;
                            break;
                        default:
                            venuePage.addContentLine(codes.TEXT_GREEN + '    ' + codes.TEXT_YELLOW + line);
                    }
                });
            } else {
                titleLines.forEach((line, index) => {
                    venuePage.addContentLine(codes.TEXT_GREEN + 
                        (index === 0 ? eventStartTime.format('HHmm') : '    ') +
                        codes.TEXT_YELLOW + line);
                });
                timeShown = true;
            }
            const subTitleLines = format.getLines(event.speaker, 34, 6, format.Justification.Left);
            for (let line of subTitleLines) {
                if (timeShown) {
                    venuePage.addContentLine(codes.TEXT_WHITE + '     ' + line);
                } else {
                    venuePage.addContentLine(codes.TEXT_GREEN + eventStartTime.format('HHmm') + codes.TEXT_WHITE + line);
                    timeShown = true;
                }
            }
            const summaryLines = format.getLines(event.description, 34, 20, format.Justification.Left);
            if (!timeShown && summaryLines.length === 0) {
                summaryLines.push(''.padEnd(34));
            }
            for (let line of summaryLines) {
                if (timeShown) {
                    venuePage.addContentLine('     ' + codes.TEXT_CYAN + line);
                } else {
                    venuePage.addContentLine(codes.TEXT_GREEN + eventStartTime.format('HHmm') + codes.TEXT_CYAN + line);
                    timeShown = true;
                }
            }
        });
        registerPage(venuePage);
    });
    registerPage(venueListPage);
}

let registerPage = page => {
    console.log('Not available yet');
}

const fetchSchedule = (callback) => {
    registerPage = callback;
    console.log('Fetching EMF Schedule...');
    axios.get('https://www.emfcamp.org/schedule/2022.json').then(response => {
        schedule = response.data;
        handleSchedule();
    });
};

export {
    fetchSchedule
}