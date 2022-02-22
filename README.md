# castletext

## RSS to Teletext server with web viewer

This project lets you browse content such as news and TV listings in [Teletext](https://en.wikipedia.org/wiki/Teletext) format, either in a web browser, or for extra nostalgia value, on a [BBC Master Series computer](https://en.wikipedia.org/wiki/BBC_Master) equipped with [Robert Sprowson's Ethernet module](http://www.sprow.co.uk/bbc/masternet.htm).

## How to use it

The server runs on a PC or Mac with Internet access running Node.JS. This server provides any connecting web browsers with the client to allow you to request and view the Teletext pages.

### Getting the code

To get the server code onto your machine using Linux or macOS:

```
git clone git@github.com:webmariner/castletext.git
cd castletext
```

### Running the server

You can run the server locally if you have [Node.JS version 8 or later](https://nodejs.org/en/download/) installed. Alternatively if you use an application container tool like [Podman](http://docs.podman.io/en/latest/) or Docker, you can run the server as a container. This means you won't have to worry about what version of node you have or any possible compatibility issues with the libraries I've used.

Once you've decided whether to use Node.JS directly or a container tool to run it, on Linux you can use your usual package manager like apt or yum to install one or the other. On macOS the fabulous [Homebrew](https://brew.sh/) will do the trick with either `brew install node` or `brew cask install podman`.

1. Running on Node.js directly

To run it using the node/npm installation on your machine:

```
npm install
npm run build
npm start
```

2. Running as a container

If you'd rather run the server in container form, thanks to [Bruce James](https://github.com/CygnusAlpha)' suggestion I've added a container file. You will need to build the container image and then run it (fire up an instance of the image). For those using podman:

```
podman build -t webmariner.uk/castletext .
podman run -p 1700:1700 -it castletext
```

For those using Docker, I believe replacing 'podman' with 'docker' in the above commands should still work.

### Using the client

Pages have a three-digit number, and some pages have more than one frame. To call up a page you would key in its number. The right and left arrow keys allow navigation forward and back between frames in the same page. Page 101 is the news menu page. Once I have implemented several more sections, I may create a page 100 to signpost these and make 100 the first page that loads in the web client.

1. Using the web client:

Point your web browser to port 1700 on the machine running the server, e.g. http://localhost:1700/

2. Using the BBC Master Series client

A separate [BBC Basic program listing](CLIENT.BBC) allows browsing pages in the same way.

You could put this on a network share, then `*MOUNT` the share on the Beeb and `*EXEC` the listing file, then either just `RUN` it directly or `SAVE` it so you can just `CHAIN` it next time. Edit line 120 to give the hostname/IP address of the machine you're running the server on.

## How the server works

The server is written in a mixture of JavaScript and TypeScript (I'm gradually converting it to TypeScript in the hope it will make the code more legible!). Some frames are [hardcoded menu frames](src/static_pages.json) designed using [edit.tf](https://github.com/rawles/edit.tf), others are generated from one of [several RSS feeds](src/feed_pages.json) or the article pages those link off to. There are 3 code files making up the core of the server, a module for generating pages from RSS news feeds, and a module for generating TV & Radio listings pages.

### The core

The [main server code file](src/index.js) is what starts first when the server runs. This loads the other modules and thereafter calls the feed module(s) every 5 minutes to get newer content. It starts listening on port 1700 and handles incoming requests for either web client files or Teletext frames.

Requests to `/` will return the HTML for the web client, and that will request the client-side JavaScript and font files that go with it. Requests to `/pages/111` or `/pages/111:2` where '111' is a page number and '2' is a frame number will return the raw BBC Master display RAM data making up a frame. Frame numbers start at zero for the first frame. If the `?b64` query string is appended to the URL, the page data is returned in Base 64 format (this is used by the web client). Using the query string `?edit` will redirect you to [edit.tf](https://edit.tf) to allow you to use the frame in question as a starting point for creating a new static page frame.

The [format module](src/format.ts) provides functions to allow frames to be converted to and from Base 64, and functions to allow text from the web to be converted to [text that's safe to display in Teletext pages](docs/FormatNotes.md), so that café appears as cafe and € as EUR. This module also allows reams of text to be split up into fixed-length lines, adding hyphens into big words that need to straddle the end of one line and the start of another to save space.

### The page module

The [page module](src/page.ts) provides some shared classes (Page, GeneratedPage, PageTemplate) which give a core structure to how frames and pages are provided by modules to the server, and the distinction between display frames which have a top line showing the page number, current date & time, and raw frames which don't have this. This means the header line can be set up in one place in the code. There is also a StaticPage class which provides a structure for static frame pages to be stored in when the server starts - these are read in from [static_pages.json](src/static_pages.json).

### The newsfeeds module

The [newsfeeds module](src/newsfeeds.ts) fetches RSS files it's given and then scrapes content from the HTML it finds at the first 9 articles mentioned in the RSS file. The module reads its configuration from [feed_pages.json](src/feed_pages.json). This results in one menu page and 9 article pages per RSS feed. The module tries to be help content providers by using HTTP HEAD requests to see if a webpage has changed since we last fetched it. A CSS-like selector is given for each feed which is then used to find all HTML nodes to use the text from (whether paragraphs or list items). The module allows for a masthead and footer colour scheme to be specified for a given feed so that the page template used to generate a feed's pages can include a custom logo or text.

### The channelfeeds module

The server can also talk to [TV Headend](https://tvheadend.org/) to generate TV & Radio listings pages.

If you have a running install of TV Headend which is set up to get Electronic Programme Guide info either over-the-air from an antenna/dish or perhaps an XMLTV provider, you can update the [channel pages JSON file](src/channel_pages.json) with the URL and credentials of your TVH server and your channel IDs to match the channel names. Then uncomment the fetchListings call in the fetchThings() function near the top of [index.js](src/index.js). My sample TV menu page is 300. If you want to use different channels, you would need to update the static frame for the listings menu page in [static_pages.json](src/static_pages.json) as well as the entries in [channel pages JSON file](src/channel_pages.json).

## Acknowledgements

The browser-based viewer is heavily based on Simon Rawles' superb [edit.tf](https://github.com/rawles/edit.tf). I wrote a separate BBC BASIC program to browse the content in a similar way, which uses Robert Sprowson's network helper functions. See also the [package.json](package.json) for the libraries I used.

## Meta-news

In June 2020, sadly Reuters decided to switch off their RSS feeds. Hat tip to Artem Bugara for [his article about Google's RSS query service](https://codarium.substack.com/p/returning-the-killed-rss-of-reuters). The Oddly Enough feed will be missed, at least until I write a scraper to replace it... You could use something like [RSS app](https://rss.app/) to generate feeds for content you want that doesn't have a feed, though you would need to create an account.

## Disclaimer

The code comes with no warranties 😉 and is released under GPL-3.0 Licence. I should probably mention that this server should be for personal use only - not because of any rights in my code but the rights in the content it fetches. To run a public-facing instance might be deemed retransmission or passing off from a copyright perspective unless you agree it with the rights holders of the news feeds first. If it's just for you and your dawg then it's effectively just a fancy web browser.
