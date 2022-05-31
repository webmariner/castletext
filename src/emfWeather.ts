import axios from 'axios';
import moment from 'moment';
import { transcodeUtf8ToBeeb } from './format';
import { Page, GeneratedPage, PageTemplate } from './page';
import * as format from './format';
import codes from './teletext_codes.json';

const weatherMasthead =
    "\u0014\u001d\u0017  `0 \u0007Weather Forecast               " +
    "\u0014\u001d\u0017x|\u007f\u007ft\u0005Ledbury, UK                    " +
    "\u0014\u001d\u0017+///'                                ";

const footerPrefix = "\u0014\u001d\u0007";

//capitalize only the first letter of the string. 
function capitalizeFirstLetter(string) {
    return string.charAt(0).toUpperCase() + string.slice(1);
}

//get human-readable wind direction from degrees
//https://stackoverflow.com/questions/61077150/converting-wind-direction-from-degrees-to-text
function windDirection(degrees) {
    const directions = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];      // Define array of directions
    degrees = degrees * 8 / 360;                                          // Split into the 8 directions
    degrees = Math.round(degrees);                                        // round to nearest integer
    degrees = (degrees + 8) % 8;                                          // Ensure it's within 0-7
    return directions[degrees]
}

//get a 3-row weather icon
function weatherIcon(iconCode) {
    switch (iconCode) {
        //day
        case '01d': return ['\u0013\u0020\u0020\u0028\u0020\u0025\u0028\u0020\u0020', '\u0013\u0020\u0020\u002c\u006a\u007f\u0028\u0024\u0020', '\u0013\u0020\u0020\u0028\u0020\u0034\u0028\u0020\u0020'];                  //clear sky
        case '02d': return ['\u0017\u0020\u0020\u0020\u0013\u0030\u0030\u0030\u0020', '\u0017\u0070\u007c\u0074\u0013\u006e\u007f\u0024\u0020', '\u0017\u002b\u002f\u0027\u0013\u0021\u0021\u0021\u0020'];                  //few clouds
        case '03d': return ['\u0017\u0020\u0020\u0060\u0030\u0020\u0020\u0020', '\u0017\u0078\u007c\u007f\u007f\u0074\u0020\u0020', '\u0017\u002b\u002f\u002f\u002f\u0027\u0020\u0020'];                                    //scattered clouds
        case '04d': return ['\u0017\u0020\u0020\u0020\u0060\u0070\u007c\u007c\u0030\u0020', '\u0017\u0078\u007e\u007f\u0074\u0033\u007f\u007f\u002f\u0020', '\u0017\u002b\u002f\u002f\u002f\u0021\u0020\u0020\u0020\u0020'];//broken clouds
        case '09d': return ['\u0017\u0060\u0070\u007e\u007d\u0030\u0020\u0020', '\u0017\u006f\u007f\u007f\u007f\u003f\u0020\u0020', '\u0014\u0028\u0028\u0028\u0028\u0020\u0020\u0020'];                                    //shower
        case '10d': return ['\u0014\u0020\u0020\u0020\u0020\u0020\u0020\u0030\u0020', '\u0014\u0020\u0020\u0020\u0030\u0020\u007e\u0021\u0020', '\u0014\u0020\u0020\u007e\u0021\u0020\u0020\u0020\u0020'];                  //rain
        case '11d': return ['\u0013\u0020\u0020\u0078\u0034\u0020\u0020', '\u0013\u0020\u003e\u0027\u0020\u0020\u0020', '\u0013\u0060\u0026\u0020\u0020\u0020\u0020'];                                                      //thunderstorm
        case '13d': return ['\u0017\u0020\u0020\u0020\u0038\u0039\u0030\u0020', '\u0017\u0038\u0039\u0030\u0022\u0026\u0020\u0020', '\u0017\u0022\u0026\u0020\u0020\u0020\u0020\u0020'];                                    //snow
        case '50d': return ['\u0017\u0028\u0028\u0028\u0028\u0028\u0020\u0020', '\u0017\u0061\u0061\u0061\u0061\u0061\u0020\u0020', '\u0017\u0024\u0024\u0024\u0024\u0024\u0020\u0020'];                                    //mist
        //night
        case '01n': return ['\u0016\u0020\u0020\u0020\u002b\u007c\u0030\u0020\u0020', '\u0016\u0020\u0020\u0020\u0020\u006a\u0035\u0020\u0020', '\u0016\u0020\u0020\u0020\u0078\u002f\u0021\u0020\u0020'];                  //clear sky
        case '02n': return ['\u0017\u0020\u0020\u0020\u0016\u0060\u0030\u0020\u0020', '\u0017\u0070\u007c\u0074\u0016\u0020\u007b\u0024\u0020', '\u0017\u002b\u002f\u0027\u0016\u0022\u0021\u0020\u0020'];                  //few clouds
        case '03n': return ['\u0017\u0020\u0020\u0060\u0030\u0020\u0020\u0020', '\u0017\u0078\u007c\u007f\u007f\u0074\u0020\u0020', '\u0017\u002b\u002f\u002f\u002f\u0027\u0020\u0020'];                                    //scattered clouds
        case '04n': return ['\u0017\u0020\u0020\u0020\u0060\u0070\u007c\u007c\u0030\u0020', '\u0017\u0078\u007e\u007f\u0074\u0033\u007f\u007f\u002f\u0020', '\u0017\u002b\u002f\u002f\u002f\u0021\u0020\u0020\u0020\u0020'];//broken clouds
        case '09n': return ['\u0017\u0060\u0070\u007e\u007d\u0030\u0020\u0020', '\u0017\u006f\u007f\u007f\u007f\u003f\u0020\u0020', '\u0014\u0028\u0028\u0028\u0028\u0020\u0020\u0020'];                                    //shower
        case '10n': return ['\u0014\u0020\u0020\u0020\u0020\u0020\u0020\u0030\u0020', '\u0014\u0020\u0020\u0020\u0030\u0020\u007e\u0021\u0020', '\u0014\u0020\u0020\u007e\u0021\u0020\u0020\u0020\u0020'];                  //rain
        case '11n': return ['\u0013\u0020\u0020\u0078\u0034\u0020\u0020', '\u0013\u0020\u003e\u0027\u0020\u0020\u0020', '\u0013\u0060\u0026\u0020\u0020\u0020\u0020'];                                                      //thunderstorm
        case '13n': return ['\u0017\u0020\u0020\u0020\u0038\u0039\u0030\u0020', '\u0017\u0038\u0039\u0030\u0022\u0026\u0020\u0020', '\u0017\u0022\u0026\u0020\u0020\u0020\u0020\u0020'];                                    //snow
        case '50n': return ['\u0017\u0028\u0028\u0028\u0028\u0028\u0020\u0020', '\u0017\u0061\u0061\u0061\u0061\u0061\u0020\u0020', '\u0017\u0024\u0024\u0024\u0024\u0024\u0020\u0020'];                                    //mist
        default: return ['', '', ''];
    }
}

const sectionParent:Page = new Page('100', 'EMF main menu');
const weatherTemplate:PageTemplate = new PageTemplate('', weatherMasthead, footerPrefix);

const handleWeather = (weatherForecast) => {

    const weatherPage = new GeneratedPage('600', sectionParent, weatherTemplate, 'Local Weather');

    weatherForecast.list.forEach(forecast => {

        const description = capitalizeFirstLetter(forecast.weather[0].description);
        const forecastDate = moment((forecast.dt + weatherForecast.city.timezone) * 1000);
        const icon = weatherIcon(forecast.weather[0].icon);

        weatherPage.addContentLine(format.getLines(codes.TEXT_GREEN + forecastDate.format('ddd DD MMM HH:mm'), 40, 1, format.Justification.Left)[0]);
        weatherPage.addContentLine(format.getLines(codes.TEXT_YELLOW + description, 40, 1, format.Justification.Left)[0]);
        weatherPage.addContentLine(format.getLines(codes.TEXT_WHITE + ' Temp' + codes.TEXT_MAGENTA + Math.round(forecast.main.temp) + ' deg C', 40 - icon[0].length, 1, format.Justification.Left)[0] + icon[0]);
        weatherPage.addContentLine(format.getLines(codes.TEXT_WHITE + ' Feels like' + codes.TEXT_MAGENTA + Math.round(forecast.main.feels_like) + ' deg C', 40 - icon[1].length, 1, format.Justification.Left)[0] + icon[1]);
        weatherPage.addContentLine(format.getLines(codes.TEXT_WHITE + ' Cloud cover' + codes.TEXT_MAGENTA + forecast.clouds.all + '%', 40 - icon[2].length, 1, format.Justification.Left)[0] + icon[2]);
        weatherPage.addContentLine(format.getLines(codes.TEXT_WHITE + ' Wind' + codes.TEXT_MAGENTA + Math.round(forecast.wind.speed * 3.6) + 'km/h' + ' (' + windDirection(forecast.wind.deg) + ')', 40, 1, format.Justification.Left)[0]);

        if (forecast.rain) {
            weatherPage.addContentLine(format.getLines(codes.TEXT_WHITE + ' Chance of rain' + codes.TEXT_MAGENTA + Math.round(forecast.pop * 100) + '% (' + forecast.rain['3h'] + 'mm)', 40, 1, format.Justification.Left)[0]);
        }
        else {
            weatherPage.addContentLine(format.getLines(codes.TEXT_WHITE + ' Chance of rain' + codes.TEXT_MAGENTA + Math.round(forecast.pop * 100) + '%', 40, 1, format.Justification.Left)[0]);
        }

        weatherPage.addContentLine(format.getLines(codes.TEXT_WHITE + ' Humidity' + codes.TEXT_MAGENTA + forecast.main.humidity + '%', 40, 1, format.Justification.Left)[0]);
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