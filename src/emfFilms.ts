import axios from 'axios';
import moment from 'moment';
import { transcodeUtf8ToBeeb } from './format';
import { Page, GeneratedPage, PageTemplate } from './page';
import * as format from './format';
import codes from './teletext_codes.json';

const filmScreeningsMasthead =
    "\u0014\u001d\u0017((,$$\u0007Film Screenings                " +
    "\u0014\u001d\u0017bj\u007f51\u0005Stage C                        " +
    "\u0014\u001d\u0017((,$$                                ";

const footerPrefix = "\u0014\u001d\u0007";

/**
 * compareStart(a, b)
 * Function to compare the start dates of two EMFCamp films
 * in a way that makes sense to Array.prototype.sort().
 * returns: negative number if a starts before b, zero if
 * a and b start at the same time, and a positive number if
 * a starts after b.
 */
const compareStart = (a, b) => {
    const aStart = new Date(a.showing.timestamp);
    const bStart = new Date(b.showing.timestamp);
    return aStart.valueOf() - bStart.valueOf();
};

const sectionParent:Page = new Page('100', 'EMF main menu');
const filmsTemplate:PageTemplate = new PageTemplate('Film screenings', filmScreeningsMasthead, footerPrefix);

const handleFilms = (filmSchedule) => {
    let currentDay = moment().day();
    const filmsPage = new GeneratedPage('300', sectionParent, filmsTemplate, 'Film screenings');
    filmSchedule.films.sort(compareStart).forEach(film => {
        const filmStartTime = moment(film.showing.timestamp);
        const titleLines = format.getLines(`${film.title} (${film.certificate}, ${film.year})`, 34, 3,
            format.Justification.Left);
        ;
        let timeShown = false;
        if (currentDay !== filmStartTime.day()) {
            titleLines.forEach((line, index) => {
                switch (index) {
                    case 0:
                        filmsPage.addContentLine(codes.TEXT_GREEN + filmStartTime.format('ddd ') + codes.TEXT_YELLOW + line);
                        break;
                    case 1:
                        filmsPage.addContentLine(codes.TEXT_GREEN + filmStartTime.format('HHmm') + codes.TEXT_YELLOW + line);
                        timeShown = true;
                        break;
                    default:
                        filmsPage.addContentLine(codes.TEXT_GREEN + '    ' + codes.TEXT_YELLOW + line);
                }
            });
        } else {
            titleLines.forEach((line, index) => {
                filmsPage.addContentLine(codes.TEXT_GREEN + 
                    (index === 0 ? filmStartTime.format('HHmm') : '    ') +
                    codes.TEXT_YELLOW + line);
            });
            timeShown = true;
        }
        const subTitleLines = format.getLines(film.tagline, 34, 6, format.Justification.Left);
        for (let line of subTitleLines) {
            if (timeShown) {
                filmsPage.addContentLine(codes.TEXT_WHITE + '     ' + line);
            } else {
                filmsPage.addContentLine(codes.TEXT_GREEN + filmStartTime.format('HHmm') + codes.TEXT_WHITE + line);
                timeShown = true;
            }
        }
        const summaryLines = format.getLines(film.precis.full, 34, 20, format.Justification.Left);
        if (!timeShown && summaryLines.length === 0) {
            summaryLines.push(''.padEnd(34));
        }
        for (let line of summaryLines) {
            if (timeShown) {
                filmsPage.addContentLine('     ' + codes.TEXT_CYAN + line);
            } else {
                filmsPage.addContentLine(codes.TEXT_GREEN + filmStartTime.format('HHmm') + codes.TEXT_CYAN + line);
                timeShown = true;
            }
        }
    });
    registerPage(filmsPage);
}

let registerPage = page => {
    console.log('Not available yet');
}

const fetchFilms = (callback) => {
    registerPage = callback;
    console.log('Fetching EMF Film showings...');
    axios.get('https://emffilms.org/schedule.json').then(response => {
        handleFilms(response.data);
    });
};

export {
    fetchFilms
}