import axios from 'axios';
import moment from 'moment';
import { transcodeUtf8ToBeeb } from './format';
import { Page, GeneratedPage, PageTemplate } from './page';
import * as format from './format';
import codes from './teletext_codes.json';

const villagesMasthead =
    "\u0014\u001d\u0015  `t \u0007                               " +
    "\u0014\u001d\u0015 0.+$\u0007Villages                       " +
    "\u0014\u001d\u0015zo0                                  ";

const footerPrefix = "\u0014\u001d\u0007";

const sectionParent: Page = new Page('100', 'EMF main menu');
const villagesTemplate: PageTemplate = new PageTemplate('', villagesMasthead, footerPrefix);

const handleVillages = (villages) => {

    const villagesPage = new GeneratedPage('700', sectionParent, villagesTemplate, 'Villages');

    villages.forEach(village => {

        const nameLines = format.getLines(village.name, 39, 20, format.Justification.Left);
        for (let line of nameLines) {
            villagesPage.addContentLine(codes.TEXT_YELLOW + line);
        }

        const descriptionLines = format.getLines(village.description, 39, 20, format.Justification.Left);
        for (let line of descriptionLines) {
            villagesPage.addContentLine(codes.TEXT_CYAN + line);
        }

        if (village.location) {
            const locationLines = format.getLines(village.location, 39, 20, format.Justification.Left);
            for (let line of locationLines) {
                villagesPage.addContentLine(codes.TEXT_GREEN + line);
            }
        }

        if (village.url) {
            const urlLines = format.getLines(village.url, 39, 20, format.Justification.Left);
            for (let line of urlLines) {
                villagesPage.addContentLine(codes.TEXT_MAGENTA + line);
            }
        }

        villagesPage.addContentLine(format.getLines(codes.TEXT_WHITE, 40, 1, format.Justification.Left)[0]);

    })
    registerPage(villagesPage);
}

let registerPage = page => {
    console.log('Not available yet');
}

const fetchVillages = (callback) => {
    registerPage = callback;
    console.log('Fetching villages...');
    axios.get(`https://www.emfcamp.org/api/villages`).then(response => {
        handleVillages(response.data);
    });
};

export {
    fetchVillages
}