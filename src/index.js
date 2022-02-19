#!/usr/bin/env node
const http = require('http');
const url = require('url');
const fs = require('fs');
const { Page, StaticPage, FrameFormat } = require('./page');
const staticPages = require('./config/static_pages.json');
const { fetchFeeds } = require('./newsfeeds');
const { fetchListings } = require('./channelfeeds');

const hostname = '0.0.0.0';
const port = 1700;

const pages = [];

const registerPage = page => {
	pages[parseInt(page.pageNumber, 16)] = page;
	return pages;
};

staticPages.forEach((pageConfig) => {
	registerPage(new StaticPage(pageConfig.number, pageConfig.frames));
});

const fetchThings = () => {
	fetchFeeds(registerPage);
	//fetchListings(registerPage);
};
fetchThings();
setInterval(fetchThings, 300000);

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
	console.log(`Request from ${req.socket.remoteAddress} for page ${pageNumberStr} frame ${frameNumber}`);
	let page = pages[pageNumber];
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
	console.log(`Page ${page.name} has ${page.rawFrames.length} frames`);
	let payload = '';
	res.statusCode = 200;
	if (fmt === '?jslit') {
		res.setHeader('Content-Type', 'text/plain');
		payload = page.getDisplayFrame(frameNumber, FrameFormat.JSLiteral);
	} else if (fmt === '?b64') {
		res.setHeader('Content-Type', 'text/plain');
		payload = page.getDisplayFrame(frameNumber, FrameFormat.EditTF);
	} else if (fmt === '?edit') {
		res.statusCode = 302;
		res.setHeader('Location', 'http://edit.tf/#0:' + page.getDisplayFrame(frameNumber, FrameFormat.EditTF));
	} else {
		res.setHeader('Content-Type', 'application/viewdata-frame');
		payload = page.getDisplayFrame(frameNumber);
	}
	res.end(payload);
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
	console.log(`CastleText server running on port ${port}`);
});
