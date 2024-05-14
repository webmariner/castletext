import axios from 'axios';
import cheerio from 'cheerio';
import { GeneratedPage, Page, PageTemplate } from './page';
import * as format from './format';
import codes from './teletext_codes.json';
import feedPageConfig from './feed_pages.json';

let pages = [];

class TranslatedWebPage extends GeneratedPage {
    private static webCache = {};

    private static pruneWebCache() {
        let liveUrls = new Set();
        pages.forEach(page => {
            if (page && page instanceof TranslatedWebPage) {
                liveUrls.add(page.webUrl);
            }
        });
        for (const weburl in TranslatedWebPage.webCache) {
            if (!liveUrls.has(weburl)) {
                console.log(`Pruning ${weburl}`)
                delete TranslatedWebPage.webCache[weburl];
            }
        }
    }

    private static checkCache(webUrl) {
        // First, some housekeeping. Prune the web cache to avoid keeping info for URLs we're not using any more.
        TranslatedWebPage.pruneWebCache();

        if (TranslatedWebPage.webCache[webUrl]) {
            // We already fetched this page once. If the Last-Modified and Etag headers match
            // the ones we got last time, then don't fetch again.
            if (TranslatedWebPage.webCache[webUrl].headAllowed) {
                axios.head(webUrl).then(response => {
                    if (response.headers['last-modified'] === TranslatedWebPage.webCache[webUrl].lastModified &&
                        response.headers['etag'] === TranslatedWebPage.webCache[webUrl].etag) {
                        TranslatedWebPage.populatePagesFromCache(webUrl);
                    } else {
                        TranslatedWebPage.fetchContent(webUrl);
                    }
                }).catch(error => {
                    // Got an error from HEAD request, assume not allowed so don't try again
                    TranslatedWebPage.webCache[webUrl].headAllowed = false;
                    TranslatedWebPage.populatePagesFromCache(webUrl);
                });
            } else {
                // HEAD requests not allowed, just fetch the content from the website
                TranslatedWebPage.fetchContent(webUrl);
            }
        } else {
            // Fetch this page for the first time
            TranslatedWebPage.fetchContent(webUrl);
        }
    }

    private static fetchContent(webUrl) {
        if (!TranslatedWebPage.webCache[webUrl]) {
            TranslatedWebPage.webCache[webUrl] = {};
        }
        let cachePage = TranslatedWebPage.webCache[webUrl];
        axios.get(webUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64; rv:124.0) Gecko/20100101 Firefox/124.0',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
                'Accept-Language': 'en-GB.en,q=0.5',
                'Accept-Encoding': 'gzip, deflate, br',
                'DNT': '1',
                'Sec-GPC': '1',
                'Connection': 'keep-alive',
                'Upgrade-Insecure-Requests': '1',
                'Sec-Fetch-Dest': 'document',
                'Sec-Fetch-Mode': 'navigate',
                'Sec-Fetch-Site': 'none',
                'Sec-Fetch-User': '?1',
                'TE': 'trailers'
            }
        }).then(resp => {
            delete cachePage.err;
            cachePage.body = resp.data;
            cachePage.headAllowed = true;
            // Remember the ETag and Last-Updated header values
            if (resp.headers['last-modified']) {
                cachePage.lastModified = resp.headers['last-modified'];
            }
            if (resp.headers['etag']) {
                cachePage.etag = resp.headers['etag'];
            }
            TranslatedWebPage.populatePagesFromCache(webUrl);
        }).catch(err => {
            console.log(`Page load failed for ${webUrl}: ${err}`);
            // Did this URL work before? If so leave it be, stale is better than broken :)
            if (cachePage.body) {
                console.log('Keeping old copy');
            } else {
                cachePage.err = err;
            }
        });
    }

    private static populatePagesFromCache(webUrl) {
        let cachePage = TranslatedWebPage.webCache[webUrl];
        for (const page of pages) {
            if (page && page instanceof TranslatedWebPage) {
                if (page.webUrl === webUrl) {
                    page.handleContent(cachePage.err, cachePage.body);
                }
            }
        }
    }
    readonly webUrl:string;
    readonly headline:string;
    readonly articleCopySelector:string;

    constructor(pageNumber:string, parent:Page, template:PageTemplate, webUrl:string, headline:string, articleCopySelector:string) {
        super(pageNumber, parent, template, `Article page ${pageNumber}`);
        this.webUrl = webUrl;
        this.headline = headline;
        this.articleCopySelector = articleCopySelector;
    }

    load() {
        // Check the web cache to see if we already have the latest content for this page
        TranslatedWebPage.checkCache(this.webUrl);
    }

    handleContent(err, body) {
        this.lines.length = 0;
        const headlineLines = format.getLines(this.headline, 39, null, format.Justification.Left);
        for (let headlineLine of headlineLines) {
            this.addContentLine(codes.TEXT_YELLOW + headlineLine);
        }
        if (err) {
            console.log(`News story load failed: ${this.webUrl}`);
            this.addContentLine(codes.BLANK_LINE);
            this.addContentLine((codes.TEXT_RED + '(article content not available)').padEnd(40));
        } else {
            const $ = cheerio.load(body);
            $('script,style').remove();
            let paragraphs = $(this.articleCopySelector);
            if (paragraphs.length === 0) {
                console.log(`No copy found for selector ${this.articleCopySelector} in ${this.webUrl}, trying p`);
                paragraphs = $('p');
            }
            if (paragraphs.length === 0) {
                console.log(`Still no copy found in body (length ${body.length}): ${paragraphs}`);
                this.addContentLine(codes.BLANK_LINE);
                this.addContentLine((codes.TEXT_RED + '(article content not available)').padEnd(40));
            }
            const that = this;
            paragraphs.each((ix, e) => {
                if (e['type'] !== 'tag') {
                    return;
                }
                const text = $(e).text();
                let isListItem = e['name'].toUpperCase() === 'LI';
                const lines = format.getLines(text, isListItem? 37:39, null, format.Justification.Left);
                that.addContentLine(codes.BLANK_LINE);
                lines.forEach((line, index) => {
                    var prefix = '';
                    if (isListItem) {
                        if (index === 0) {
                            prefix = codes.TEXT_CYAN + '*' + codes.TEXT_WHITE;
                        } else {
                            prefix = '   ';
                        }
                    } else {
                        prefix = ' ';
                    }
                    that.addContentLine(prefix + line);
                });
            });
        }
    }
}

class RSSFeedPageGenerator {
    template:PageTemplate;
    menuPageNumber:string;
    menuPageName:string;
    feedUrl:string;
    exclude:string;
    articleCopySelector:string;
    sectionParent:Page;

    constructor(template:PageTemplate, menuPageNumber:string, menuPageName:string, feedUrl:string, exclude:string, articleCopySelector:string, sectionParent:Page) {
        this.template = template;
        this.menuPageNumber = menuPageNumber;
        this.menuPageName = menuPageName;
        this.feedUrl = feedUrl;
        this.exclude = exclude;
        this.articleCopySelector = articleCopySelector;
        this.sectionParent = sectionParent;
    }

    generatePages() {
        let pageNumber = parseInt(this.menuPageNumber, 16);
        axios.get(this.feedUrl).then(resp => {
            let feedFormat, $, stories;
            if (resp.headers['content-type'].startsWith('application/atom+xml')) {
                feedFormat = 'atom';
            } else if (resp.headers['content-type'].startsWith('application/rss+xml')
                || resp.headers['content-type'].startsWith('application/xml')
                || resp.headers['content-type'].startsWith('text/xml')) {
                feedFormat = 'rss';
            } else if (resp.headers['content-type'].startsWith('application/json')) {
                feedFormat = 'reuters';
            }
            switch (feedFormat) {
            case 'reuters':
                stories = resp.data.result.articles.map(e => {
                    return {
                        headline: e.basic_headline,
                        link: `https://www.reuters.com${e.canonical_url}`
                    };
                });
                break;
            case 'atom':
                $ = cheerio.load(resp.data, {xmlMode: true});
                stories = $('entry').map((i, e) => {
                    return {
                        headline: $(e).find('title').text(),
                        link: $(e).find('link').attr('href')
                    };
                });
                break;
            case 'rss':
                $ = cheerio.load(resp.data, {xmlMode: true});
                stories = $('item').map((i, e) => {
                    return {
                        headline: $(e).find('title').text(),
                        link: $(e).find('link').text()
                    };
                });
                break;
            }
            const feedMenuPage:GeneratedPage = new GeneratedPage(this.menuPageNumber, sectionParent, this.template, this.menuPageName);
            let j = 0;
            console.log(`${this.menuPageName} [${resp.headers['content-type']}]`);
            for (var story of stories) {
                const headline = story.headline;
                const link = story.link;
                console.log(`   ${headline}`);
                console.log(`      [${link}]`);
                if (this.exclude && headline.match(new RegExp(this.exclude))) {
                    continue;
                } else {
                    j++;
                }
                let articlePageNumber = (pageNumber + j).toString(16);
                const articlePage:TranslatedWebPage = new TranslatedWebPage(
                    articlePageNumber, feedMenuPage, this.template, link, headline, this.articleCopySelector
                );
                articlePage.load();
                registerPage(articlePage);
                pages[parseInt(articlePage.pageNumber, 16)] = articlePage;
                let lines = format.getLines(headline,35,2,format.Justification.Left);
                feedMenuPage.addContentLine(codes.TEXT_YELLOW + articlePageNumber + codes.TEXT_WHITE + lines[0]);
                if (lines[1]) feedMenuPage.addContentLine('     ' + lines[1]);
                if (j === 9) {
                    break;
                }
            }
            registerPage(feedMenuPage);
        }).catch(err => {
            console.error(`Problem parsing feed for ${this.menuPageName}`);
            console.error(err);
            return;
        });
    }
}

// Until we figure out how to access other pages and whether to wire them using a parent attribute in the config files, hardcode a news
// section home page for now...
const sectionParent:Page = new Page('500', 'UK & World News menu');

const feedPageGenerators:[RSSFeedPageGenerator] = feedPageConfig.map(feedConfig => {
    const template = feedConfig.masthead && feedConfig.footerPrefix ?
        new PageTemplate(feedConfig.name, feedConfig.masthead, feedConfig.footerPrefix) :
        new PageTemplate(feedConfig.name);
    return new RSSFeedPageGenerator(template, feedConfig.number, feedConfig.name, feedConfig.feed, feedConfig.exclude, feedConfig.articleCopy, sectionParent);
}) as [RSSFeedPageGenerator];

let registerPage = page => {
    console.log('Not available yet');
}

const fetchFeeds = (callback) => {
    registerPage = callback;
    console.log('Fetching feeds...');
    feedPageGenerators.forEach((generator) => {
        generator.generatePages();
    });
};

export {
    fetchFeeds
}