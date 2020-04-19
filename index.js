const http = require('http');
const he = require('he');
const url = require('url');
const request = require('request');
const fs = require('fs');
const cheerio = require('cheerio');
const parser = require('davefeedread');
const moment = require('moment');
const format = require('./format.js');
const hostname = '0.0.0.0';
const port = 1700;

const BLANK_LINE = ''.padEnd(40);
const TEXT_RED		= '\x01',
	TEXT_GREEN		= '\x02',
	TEXT_YELLOW		= '\x03',
	TEXT_BLUE		= '\x04',
	TEXT_MAGENTA 	= '\x05',
	TEXT_CYAN		= '\x06',
	TEXT_WHITE		= '\x07',
	FLASH_ON		= '\x08',
	FLASH_OFF		= '\x09',
	NORMAL_HEIGHT	= '\x0c',
	DOUBLE_HEIGHT	= '\x0d',
	GFX_RED			= '\x11',
	GFX_GREEN		= '\x12',
	GFX_YELLOW		= '\x13',
	GFX_BLUE		= '\x14',
	GFX_MAGENTA		= '\x15',
	GFX_CYAN		= '\x16',
	GFX_WHITE		= '\x17',
	CONCEAL			= '\x18',
	CONTIGUOUS_GFX	= '\x19',
	SEPARATED_GFX	= '\x1a',
	BLACK_BACKGRD	= '\x1b',
	NEW_BACKGRD		= '\x1d',
	HOLD_GFX		= '\x1e',
	RELEASE_GFX		= '\x1f';

const menuPages = [
	{
		number: '101',
		frames: ['NEUCDAsYePHhg4WZFmxYkaIEDxYZLLHiR4s0INCjYsQIECA0RQIGqBB_a_2qlZkQakCBqgQPVhkkgaoHqxBlSoNSBAgQIDRFAgU8En9__a5ODpBqQIOvBh14GSaBqg68NCHSg1IECBAgAnQY1AgQIECBAgQTcOncgnZe_NBNy7uqBAgQIECBAgQIECACdBjUCBAgQIECBBNw6dyCdl780E3Lu6oECBAgQIECBAgQIECBAgQIECBAgQIECBAgQIECBAgQIECBAgQIECBAgQIECBAgBDUCBBChQ0CBAgQIECBAgQIECBAgQSd2TLwy7smXd0QIECAENQIEEKFDQIECBAgQIECBAgQIECBBJ3ZMvDLuyZd3RAgQIAbFiwDTcOncgnZe_NAgQIECAGxZMA03Dp3IJ2XvzQIECBAgBsmTANX38tmRBOy9-aBAgQIAbFywDU8enLux5UCBAgQIECAGyZsA1TLj0bt-zfn8oECBAgBsmjANQ37NPTTj5oECBAgQIECBAgQIECBAgQIECBAgQIECBAgQIECBAgQIECBAgQIECBAgBDUCBBSy9emXlzQIECBAgQIECBAgQUsufTz6ZeSBAgQIECAENQIEFLL16ZeXNAgQIECBAgQIECBBSy59PPpl5IECBAgQIAbFowDVN_BBOy9-aBAgQIECAGxbMA0jLhybNO7LzQIECBAgBsWrANPyZNnlBF3b-ufQgQIAbFuwDVsvLT08oKfTfiQIECBAgQIECBAgQIECBAgQIECBAgQIECBAgQIECBAgQIECBAgQIAbFmwDRevLfuy9-aBAgQIECBAgQIECBAgQIECBAgQIECBAgBsXDANT2YeejJv6IECBAgQIECBAgQIECBAgQIECBAgQIECAGyYMA0frh5ZNOHcgQIECBAgQIECBAgQIECBAgQIECBAgQIAbJiwDSd2TLwy7smXd0XacqBAgQIECBAgQIECBAgQIECBAgQIECBAgQIECBAgQIECBAgQIECBAgQIECBAgQIECBAgQIECBAgQIECBAgQIECBAgQIECBAgQIECBAgQIECBAgQIECBAgQIAJ0GgQIECBAgQIECCbh07kE3Lu6oGLBggQIECBAgQIECBAgQIECBAgQIECBAgQIECBAgQIECBAgQIECBAgQIECBAgQIECA']
	},
	{
		number: '110',
		feed: 'http://feeds.bbci.co.uk/news/rss.xml',
		name: 'BBC Main News',
		masthead:
			'\x17\x60\x70\x70\x70\x60\x70\x70\x70\x60\x70\x70\x70\x14\x7c\x7c\x3c\x7c\x3c\x7c\x2c\x7c\x6c\x6c\x3c\x7c\x6c\x3c\x3c\x2c\x3c\x7c\x6c\x3c\x3c\x2c\x7c\x7c\x7c\x7c' +
			'\x17\x6a\x20\x24\x7a\x6a\x20\x24\x7a\x6a\x20\x74\x7a\x14\x1d\x13\x6a\x64\x6e\x68\x73\x34\x35\x7d\x7a\x20\x7d\x7a\x6a\x73\x6a\x30\x35\x7a\x6a\x73\x20\x20\x20\x20' +
			'\x17\x6a\x70\x71\x7a\x6a\x70\x71\x7a\x6a\x70\x71\x7a\x14\x1d\x13\x2a\x20\x2a\x2a\x20\x25\x25\x25\x2b\x20\x25\x2b\x2a\x2c\x20\x2d\x29\x25\x28\x2e\x20\x20\x20\x20',
		footerPrefix: TEXT_BLUE + NEW_BACKGRD + TEXT_WHITE,
		articleCopy: '#page div.story-body__inner>p'
	},
	{
		number: '120',
		feed: 'http://www.independent.co.uk/news/rss',
		name: 'Independent Top News',
		masthead:
			'\x11\x60\x7c\x77\x7d\x74\x17INDEPENDENT                      ' +
			'\x11\x6a\x7f\x34\x7f\x7f\x17\x3d\x38\x35\x76\x79\x6a\x6a\x74\x35\x6a\x74\x35\x77\x31\x6d\x6a\x68\x25\x77\x31             ' +
			'\x11\x22\x2f\x7c\x3e\x27\x17\x25\x21\x25\x25\x2a\x2a\x2a\x22\x25\x2a\x22\x25\x2d\x24\x22\x27\x27\x20\x2c\x25             ',
		footerPrefix: TEXT_RED + NEW_BACKGRD + TEXT_WHITE,
		articleCopy: '#main div.body-content>p'
	},
	{
		number: '130',
		feed: 'http://feeds.feedburner.com/euronews/en/home/',
		name: 'Euronews',
		masthead:
			'\x17\x1d\x14\x60\x2c\x30\x68  \x34\x60\x2c\x24\x60\x2c\x30\x60\x7c\x7c\x30\x60\x3c\x74\x68\x30\x68\x34\x60\x34\x78\x2c\x74        ' +
			'\x17\x1d\x14\x3d\x2c\x2e\x6a  \x35\x35  \x35 \x6a\x6a\x35\x6a\x35\x7f\x2c\x2e\x22\x7d\x7e\x7d\x7e\x21\x2b\x2c\x74        ' +
			'\x17\x1d\x14\x22\x2c\x21 \x29\x26 \x25  \x22\x2c\x21\x2a\x25\x2a\x25\x22\x2d\x27 \x2a\x25\x2a\x25 \x2b\x2c\x27\x2a\x25      ',
		footerPrefix: TEXT_WHITE + NEW_BACKGRD + TEXT_BLUE,
		articleCopy: 'div.c-article-content>p'
	},
	{
		number: '140',
		feed: 'http://feeds.reuters.com/reuters/topNews',
		name: 'Reuters Top News',
		articleCopy: 'div.StandardArticleBody_body>p'
	},
	{
		number: '150',
		feed: 'http://feeds.reuters.com/reuters/oddlyEnoughNews',
		name: 'Reuters Oddly Enough',
		articleCopy: 'div.StandardArticleBody_body>p'
	},
	{
		number: '160',
		feed: 'https://www.theregister.co.uk/headlines.atom',
		name: 'Register Headlines',
		masthead:
			'\x01\x1d\x17\x20\x20\x38\x6f\x7d\x30\x20\x07                             ' +
			'\x01\x1d\x17\x60\x7c\x7d\x7f\x7f\x21\x30\x07T H E   R E G I S T E R      ' +
			'\x01\x1d\x17\x6f\x21\x22\x7f\x7d\x3e\x20\x03biting the hand that feeds IT',
		footerPrefix: TEXT_RED + NEW_BACKGRD + TEXT_WHITE,
		articleCopy: '#body>p'
	},
	{
		number: '170',
		feed: 'https://www.theregister.co.uk/bootnotes/stob/headlines.atom',
		name: 'Verity Stob Bootnotes',
		masthead:
			'\x01\x1d\x17\x20\x20\x38\x6f\x7d\x30\x20\x07                             ' +
			'\x01\x1d\x17\x60\x7c\x7d\x7f\x7f\x21\x30\x07T H E   R E G I S T E R      ' +
			'\x01\x1d\x17\x6f\x21\x22\x7f\x7d\x3e\x20\x03Verity Stob\'s Bootnotes      ',
		footerPrefix: TEXT_RED + NEW_BACKGRD + TEXT_WHITE,
		articleCopy: '#body>p'
	},
	{
		number: '180',
		feed: 'http://rss.slashdot.org/Slashdot/slashdot',
		name: 'Slashdot',
		articleCopy: 'div.body div.p'
	},
	{
		number: '190',
		feed: 'http://www.independent.co.uk/news/science/rss',
		name: 'Independent - Science',
		articleCopy: '#main div.body-content>p'
	},
	{
		number: '200',
		feed: 'https://www.theguardian.com/uk/rss',
		name: 'The Guardian',
		articleCopy: 'div.content__article-body>p'
	},
	{
		number: '210',
		feed: 'https://www.independent.ie/rss/',
		name: 'Irish Independent',
		articleCopy: 'div.n-body1>p'
	},
	{
		number: '220',
		feed: 'http://feeds.bbci.co.uk/news/world/rss.xml',
		name: 'BBC World News',
		masthead:
			'\x17`ppp`ppp`ppp\x14||<|l<|,|,|l<||l<<,<|l<<,|' + 
			'\x17j $zj $zj tz\x14\x1d\x13j05jh#4w$5ji }zjsj05zjs ' + 
			'\x17jpqzjpqzjpqz\x14\x1d\x13 -)%\x22,!%%-*& %+*, -)%(. ',
		footerPrefix: TEXT_BLUE + NEW_BACKGRD + TEXT_WHITE,
		articleCopy: '#page div.story-body__inner>p'
	},
	{
		number: '230',
		feed: 'http://feeds.bbci.co.uk/news/technology/rss.xml',
		name: 'BBC Tech News',
		masthead:
			'\x17`ppp`ppp`ppp\x14||,l,l<ll<|l<<,<|l<<,|||||' +
			'\x17j $zj $zj tz\x14\x1d\x13k!w16!uz }zjsj05zjs     ' +
			'\x17jpqzjpqzjpqz\x14\x1d\x13* -$)$%* %+*, -)%(.     ',
		footerPrefix: TEXT_BLUE + NEW_BACKGRD + TEXT_WHITE,
		articleCopy: '#page div.story-body__inner>p'
	},
	{
		number: '240',
		feed: 'http://www.independent.co.uk/news/uk/politics/rss',
		name: 'Independent Politics',
		masthead:
			'\x11\x60\x7c\x77\x7d\x74\x17INDEPENDENT                      ' +
			'\x11\x6a\x7f\x34\x7f\x7f\x17\x3d\x38\x35\x76\x79\x6a\x6a\x74\x35\x6a\x74\x35\x77\x31\x6d\x6a\x68\x25\x77\x31             ' +
			'\x11\x22\x2f\x7c\x3e\x27\x17\x25\x21\x25\x25\x2a\x2a\x2a\x22\x25\x2a\x22\x25\x2d\x24\x22\x27\x27\x20\x2c\x25             ',
		footerPrefix: TEXT_RED + NEW_BACKGRD + TEXT_WHITE,
		articleCopy: '#main div.body-content>p'
	}
];

const pages = [];
const webpages = {};
const feeds = [];
menuPages.forEach((menuPage) => {
	let pageNumber = parseInt(menuPage.number, 16);
	pages[pageNumber] = menuPage;
	if (menuPage.frames) {
		menuPage.rawFrames = [];
		for (let i = 0; i < menuPage.frames.length; i++) {
			menuPage.rawFrames[i] = format.b64ToMode7RAM(menuPage.frames[i]);
		}
	}
	if (menuPage.feed) {
		feeds.push(menuPage);
	}
});

const fetchFeeds = () => {
	console.log('Fetching feeds...');
	feeds.forEach((menuPage) => {
		let pageNumber = parseInt(menuPage.number, 16);
		parser.parseUrl(menuPage.feed, 10, (err, out) => {
			if (err) {
				console.error(`Problem parsing feed for ${menuPage.name}`);
				console.error(err);
				return;
			}
			if (!menuPage.masthead) {
				menuPage.masthead = (TEXT_BLUE + NEW_BACKGRD + DOUBLE_HEIGHT + TEXT_WHITE + '>' + TEXT_CYAN + menuPage.name).padEnd(40);
				menuPage.masthead += menuPage.masthead;
				menuPage.masthead = menuPage.masthead + (GFX_BLUE + NEW_BACKGRD).padEnd(40);
			}
			if (!menuPage.footerPrefix) {
				menuPage.footerPrefix = TEXT_BLUE + NEW_BACKGRD + TEXT_CYAN;
			}
			let output = menuPage.masthead + BLANK_LINE;
			for (let j = 1; j <= Math.min(out.items.length, 9); j++) {
				let articlePageNumber = (pageNumber + j).toString(16);
				let headline = he.decode(out.items[j-1].title);
				pages[pageNumber + j] = {
					number: articlePageNumber,
					headline: headline,
					source: out.items[j-1].link,
					menuPage: menuPage
				};
				fetchPage(pageNumber + j);
				let lines = format.getLines(headline,35,2,format.justifyTypes.LEFT_JUSTIFY);
				output += TEXT_YELLOW + articlePageNumber + TEXT_WHITE + lines[0];
				if (lines[1]) output += '     ' + lines[1];
			}
			while ((output.length / 40) < 23) output += BLANK_LINE;
			let footer = menuPage.footerPrefix + 'News main menu';
			footer = footer.padEnd(36);
			footer += '101 ';
			output += footer;
			menuPage.rawFrames = [output];
		});
	});
	/*	Prune the webpages map - stories will drop off the top nine and the webpage entry
		will stay in memory with nothing using it, so we need to go through the map looking
		for webpages which teletext pages no longer point to, and delete those to stop
		memory leaks.

		Note:
		1)	Webpages might be referenced by more than one RSS feed, so several teletext
			pages might use one given webpage entry;
		2)	The pruning runs at the start (before any pages have been created yet) and then
			each time the feeds are fetched (before the results have come back), so there
			is a lag of one run between a webpage being obsoleted and it actuaully being
			removed from the map.
	*/
	let liveUrls = new Set();
	for (const page of pages) {
		if (page && page.source) {
			liveUrls.add(page.source);
		}
	}
	for (const weburl in webpages) {
		if (!liveUrls.has(weburl)) {
			console.log(`Pruning ${weburl}`)
			delete webpages[weburl];
		}
	}
};
fetchFeeds();
setInterval(fetchFeeds, 300000);

const fetchPage = (pageNumber) => {
	const page = pages[pageNumber];
	if (webpages[page.source]) {
		// We already fetched this page once. For now, just keep the first copy. BUT...
		// TODO: do a HEAD request and compare ETag or update date to the one we last got
		return;
	}
	const menuPage = page.menuPage;
	console.log(`Fetching new ${menuPage.name} article from ${page.source}`);
	request(page.source, function(err, resp, body){
		let contentLines = [];
		const headlineLines = format.getLines(page.headline, 39, null, format.justifyTypes.LEFT_JUSTIFY);
		for (let headlineLine of headlineLines) {
			contentLines.push(TEXT_YELLOW + headlineLine);
		}
		if (err) {
			contentLines.push(BLANK_LINE);
			contentLines.push((TEXT_RED + '(article content not available)').padEnd(40));
		} else {
			const $ = cheerio.load(body);
			const paragraphs = $(menuPage.articleCopy);
			$(paragraphs).each((i, paragraph) => {
				const lines = format.getLines($(paragraph).text(), 39, null, format.justifyTypes.LEFT_JUSTIFY);
				contentLines.push(BLANK_LINE);
				for (let line of lines) {
					contentLines.push(' ' + line);
				}
			});
		}
		// Now we have all the lines of content, split them into screenfuls (content frames)
		const CONTENT_FRAME_HEIGHT = 18;
		let contentFrames = [];
		let contentFrame = '';
		let frameLinesLeft = CONTENT_FRAME_HEIGHT;
		for (let line = 0; line < contentLines.length; line++) {
			if (frameLinesLeft === CONTENT_FRAME_HEIGHT && contentLines[line] === BLANK_LINE) {
				// Ignore this blank line as we're at the top of a new frame
			} else {
				contentFrame += contentLines[line];
			}
			if (line === (contentLines.length - 1)) {
				// We've used the last content line, so fill any remaining frame space with blank lines
				while ((contentFrame.length / 40) < CONTENT_FRAME_HEIGHT) contentFrame += BLANK_LINE;
			}
			frameLinesLeft = CONTENT_FRAME_HEIGHT - (Math.trunc(contentFrame.length / 40));
			if (frameLinesLeft === 0) {
				// We've completed a content frame
				contentFrames.push(contentFrame);
				contentFrame = '';
				frameLinesLeft = CONTENT_FRAME_HEIGHT;
			}
		}

		// Now we have content frames, add the header and footer to each to make the raw frames
		let rawFrames = [];
		for (let f = 0; f < contentFrames.length; f++) {
			let output = menuPage.masthead ? menuPage.masthead : (BLANK_LINE + BLANK_LINE + BLANK_LINE);
			if (contentFrames.length > 1) {
				output += `${TEXT_CYAN}${f + 1}/${contentFrames.length}`.padStart(40);
			} else {
				output += BLANK_LINE;
			}
			output += contentFrames[f];
			if (f < contentFrames.length - 1) {
				output += `${TEXT_CYAN}contd...`.padStart(40);
			} else {
				output += BLANK_LINE;
			}
			let footer = '';
			footer += menuPage.footerPrefix;
			footer += menuPage.name + ' index';
			footer = footer.padEnd(36);
			footer += menuPage.number;
			footer += ' ';
			output += footer;
			rawFrames.push(output);
		}
		if (!webpages[page.source]) {
			webpages[page.source] = {};
		}
		webpages[page.source].rawFrames = rawFrames;
	});
};

const server = http.createServer((req, res) => {
	const reqUrl = url.parse(req.url, true);
	const fmt = reqUrl.search;
	const path = reqUrl.pathname;
	if (path === '/' || path.startsWith('/fonts/') || path.endsWith('.js')) {
		serveViewer(req, res, path);
		return;
	}
	let pageNumberStr = path.substring(7, 10);
	let pageNumber = parseInt(pageNumberStr, 16);
	let frameNumber = 0;
	if (path.length > 10) frameNumber = parseInt(path.substring(11), 10);
	console.log(`Request from ${req.connection.remoteAddress} for page ${pageNumberStr} frame ${frameNumber}`);
	let page = pages[pageNumber];
	if (page && page.source) {
		page = webpages[page.source];
	}
	if (!page || !page.rawFrames) {
		res.statusCode = 404;
		res.setHeader('Content-Type', 'text/json');
		res.end('{"error": "Page not found"}');
		return;
	};
	if (page.rawFrames.length < (frameNumber + 1)) {
		res.statusCode = 404;
		res.setHeader('Content-Type', 'text/json');
		res.end('{"error": "Frame not found"}');
		return;
	}
	console.log(`Page has ${page.rawFrames.length} frames`);
	const currentDate = moment().format('ddd DD MMM Y' + TEXT_YELLOW + 'HH:mm.ss');
	const header = `P${pageNumberStr}${TEXT_RED}CastleText${TEXT_CYAN}${currentDate}`;
	const frames = page.rawFrames;
	let payload = '';
	if (frames[frameNumber]) {
		res.statusCode = 200;
		if (fmt === '?jslit') {
			res.setHeader('Content-Type', 'text/plain');
			payload = format.rawToJsStringLiteral(header + frames[frameNumber]);
		} else if (fmt === '?b64') {
			res.setHeader('Content-Type', 'text/plain');
			payload = format.rawToB64(header + frames[frameNumber]);
		} else if (fmt === '?edit') {
			res.statusCode = 302;
			res.setHeader('Location', '/#0:' + format.rawToB64(header + frames[frameNumber]));
		} else {
			res.setHeader('Content-Type', 'application/viewdata-frame');
			payload = header + frames[frameNumber];
		}
		res.end(payload);
	} else {
		res.statusCode = 501;
		res.setHeader('Content-Type', 'text/json');
		res.end('{"error": "Not implemented"}');
	}
});

const viewerFiles = [
	{
		file: 'viewer/index.html',
		httpPath: '/',
		mime: 'text/html'
	},
	{
		file: 'viewer/teletext-editor.js',
		httpPath: '/teletext-editor.js',
		mime: 'text/javascript'
	},
	{
		file: 'viewer/TeletextKit.eot',
		httpPath: '/fonts/TeletextKit.eot',
		mime: 'application/vnd.ms-fontobject'
	},
	{
		file: 'viewer/TeletextKit.svg',
		httpPath: '/fonts/TeletextKit.svg',
		mime: 'image/svg+xml'
	},
	{
		file: 'viewer/TeletextKit.ttf',
		httpPath: '/fonts/TeletextKit.ttf',
		mime: 'application/x-font-ttf'
	},
	{
		file: 'viewer/TeletextKit.woff',
		httpPath: '/fonts/TeletextKit.woff',
		mime: 'font/woff'
	},
	{
		file: 'viewer/TeletextTG.svg',
		httpPath: '/fonts/TeletextTG.svg',
		mime: 'image/svg+xml'
	}
];

const serveViewer = (req, res, path) => {
	let found = false;
	for (file of viewerFiles) {
		if (file.httpPath === path) {
			found = true;
			console.log(`Got request for ${file.httpPath} so serving ${file.file}`)
			fs.readFile(file.file, (err, data) => {
				if (err) {
					res.statusCode = 500;
					res.end(`Problem serving viewer file: ${err}`);
				} else {
					res.setHeader('Content-Type', file.mime);
					res.end(data);
				}
			});
			break;
		}
	}
	if (!found) {
		res.statusCode = 404;
		res.end('File not found');
		return;
	}
};

server.listen(port, hostname, () => {
	console.log(`Se⚹tile server running on port ${port}`);
});

