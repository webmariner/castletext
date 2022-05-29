import axios from 'axios';
import moment from 'moment';
import { transcodeUtf8ToBeeb } from './format';
import { Page, GeneratedPage, PageTemplate } from './page';
import * as format from './format';
import codes from './teletext_codes.json';

//TODO: put a weather icon in the header

const weatherMasthead = "\u0014\u001d\u0015 < \u0007Local Weather                    \u0014\u001d\u0017x}0\u0005                                 \u0014\u001d\u0017\u007fk5                                  ";
const footerPrefix = "\u0014\u001d\u0007";

//capitalize only the first letter of the string. 
function capitalizeFirstLetter(string) {
    return string.charAt(0).toUpperCase() + string.slice(1);
}

const sectionParent:Page = new Page('100', 'EMF main menu');
const weatherTemplate:PageTemplate = new PageTemplate('Film screenings', weatherMasthead, footerPrefix);        //TODO: what is this?

const handleWeather = (weatherForecast) => {

    const weatherPage = new GeneratedPage('600', sectionParent, weatherTemplate, 'Local Weather');

    weatherForecast.list.forEach(forecast => {

        //TODO: forecast icon
        //TODO: is time UTC or BST?

        const description = capitalizeFirstLetter(forecast.weather[0].description);
        const forecastDate = moment(forecast.dt*1000);

        weatherPage.addContentLine(format.getLines(codes.TEXT_GREEN + forecastDate.format('ddd DD MMM HH:mm'), 40, 1, format.Justification.Left)[0]);
        weatherPage.addContentLine(codes.DOUBLE_HEIGHT + format.getLines(codes.TEXT_YELLOW + description, 39, 1, format.Justification.Left)[0]);
        weatherPage.addContentLine(format.getLines(codes.TEXT_YELLOW, 40, 1, format.Justification.Left)[0]);
        weatherPage.addContentLine(format.getLines(codes.TEXT_WHITE + ' Temp' + codes.TEXT_MAGENTA + Math.round(forecast.main.temp) + ' deg C', 40, 1, format.Justification.Left)[0]);        
        weatherPage.addContentLine(format.getLines(codes.TEXT_WHITE + ' Feels like' + codes.TEXT_MAGENTA + Math.round(forecast.main.feels_like) + ' deg C', 40, 1, format.Justification.Left)[0]);        
        weatherPage.addContentLine(format.getLines(codes.TEXT_WHITE + ' Cloud cover' + codes.TEXT_MAGENTA + forecast.clouds.all + '%', 40, 1, format.Justification.Left)[0]);

        if (forecast.rain) {
            weatherPage.addContentLine(format.getLines(codes.TEXT_WHITE + ' Chance of rain' + codes.TEXT_MAGENTA + Math.round(forecast.pop * 100) + '% (' + forecast.rain['3h'] + 'mm)', 40, 1, format.Justification.Left)[0]);           
        }
        else {
            weatherPage.addContentLine(format.getLines(codes.TEXT_WHITE + ' Chance of rain' + codes.TEXT_MAGENTA + Math.round(forecast.pop * 100) + '%', 40, 1, format.Justification.Left)[0]);
        }
        
        weatherPage.addContentLine(format.getLines(codes.TEXT_WHITE + ' Humidity' + codes.TEXT_MAGENTA + forecast.main.humidity + '%', 40, 1, format.Justification.Left)[0]);
        //weatherPage.addContentLine(format.getLines(codes.TEXT_WHITE + ' Visibility' + codes.TEXT_MAGENTA + forecast.visibility + 'm', 40, 1, format.Justification.Left)[0]);
        weatherPage.addContentLine(format.getLines(codes.TEXT_WHITE, 40, 1, format.Justification.Left)[0]);

    })
    registerPage(weatherPage);
}

let registerPage = page => {
    console.log('Not available yet');
}

const fetchWeather = (callback) => {
    registerPage = callback;
    console.log('Fetching weather forecast...');
    const apiKey = 'your API key here';
    axios.get(`http://api.openweathermap.org/data/2.5/forecast?lat=52.03862086477766&lon=-2.379884915775082&units=metric&appid=${apiKey}`).then(response => {
        handleWeather(response.data);
    });
};

export {
    fetchWeather
}