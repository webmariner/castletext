import * as parser from 'davefeedread';
import * as he from 'he';
import axios from 'axios';
import * as request from 'request';
import cheerio from 'cheerio';
import { GeneratedPage, Page, PageTemplate } from './page';
import * as format from './format';
import * as codes from './teletext_codes';
import * as feedPageConfig from './config/feed_pages';

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
                    if (response.headers['Last-Modified'] === TranslatedWebPage.webCache[webUrl].lastModified &&
                        response.headers['Etag'] === TranslatedWebPage.webCache[webUrl].etag) {
                        return;
                    } else {
                        TranslatedWebPage.fetchContent(webUrl);
                    }
                }).catch(error => {
                    // Got an error from HEAD request, assume not allowed so don't try again
                    TranslatedWebPage.webCache[webUrl].headAllowed = false;
                });
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
        request(webUrl, function(err, resp, body){
            if (err) {
                console.log(`Page load failed: ${webUrl}`);
                // Did this URL work before? If so leave it be, stale is better than broken :)
                if (cachePage.body) {
                    console.log('Keeping old copy');
                    return;
                } else {
                    cachePage.err = err;
                    console.log(err);
                }
            } else {
                delete cachePage[err];
                cachePage.body = body;
                cachePage.headAllowed = true;
                // Remember the ETag and Last-Updated header values
                if (resp.headers['Last-Modified']) {
                    cachePage.lastModified = resp.headers['Last-Modified'];
                }
                if (resp.headers['Etag']) {
                    cachePage.etag = resp.headers['Etag'];
                }
            }
            for (const page of pages) {
                if (page && page instanceof TranslatedWebPage) {
                    if (page.webUrl === webUrl) {
                        page.handleContent(cachePage.err, cachePage.body);
                    }
                }
            }
        });
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
        console.log(`Checking cache for ${this.parent.name} article from ${this.webUrl}`);
    }

    handleContent(err, body) {
        this.lines.length = 0;
        const headlineLines = format.getLines(this.headline, 39, null, format.Justification.Left);
        for (let headlineLine of headlineLines) {
            this.addContentLine(codes.TEXT_YELLOW + headlineLine);
        }
        if (err) {
            this.addContentLine(codes.BLANK_LINE);
            this.addContentLine((codes.TEXT_RED + '(article content not available)').padEnd(40));
        } else {
            const $ = cheerio.load(body);
            const paragraphs = $(this.articleCopySelector);
            if (!paragraphs.length) {
                console.log(`Couldn't find paragraphs using selector ${this.articleCopySelector} in the following source:`);
                //console.log(body);
                console.log(this.webUrl);
                this.addContentLine(codes.BLANK_LINE);
                this.addContentLine((codes.TEXT_RED + '(article content not available)').padEnd(40));
            }
            const that = this;
            $(paragraphs).each(function(i, paragraph) {
                const isListItem = $(this)[0].name === 'li';
                const lines = format.getLines($(this).text(), isListItem? 37:39, null, format.Justification.Left);
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
    articleCopySelector:string;
    sectionParent:Page;

    constructor(template:PageTemplate, menuPageNumber:string, menuPageName:string, feedUrl:string, articleCopySelector:string, sectionParent:Page) {
        this.template = template;
        this.menuPageNumber = menuPageNumber;
        this.menuPageName = menuPageName;
        this.feedUrl = feedUrl;
        this.articleCopySelector = articleCopySelector;
        this.sectionParent = sectionParent;
    }

    generatePages() {
        let pageNumber = parseInt(this.menuPageNumber, 16);
        parser.parseUrl(this.feedUrl, 10, (err, out) => {
            if (err) {
                console.error(`Problem parsing feed for ${this.menuPageName}`);
                console.error(err);
                return;
            }
            const feedMenuPage:GeneratedPage = new GeneratedPage(this.menuPageNumber, sectionParent, this.template, this.menuPageName);
            for (let j = 1; j <= Math.min(out.items.length, 9); j++) {
                let articlePageNumber = (pageNumber + j).toString(16);
                let headline = he.decode(out.items[j-1].title);
                const articlePage:TranslatedWebPage = new TranslatedWebPage(
                    articlePageNumber, feedMenuPage, this.template, out.items[j-1].link, headline, this.articleCopySelector
                );
                articlePage.load();
                registerPage(articlePage);
                pages[parseInt(articlePage.pageNumber, 16)] = articlePage;
                let lines = format.getLines(headline,35,2,format.Justification.Left);
                feedMenuPage.addContentLine(codes.TEXT_YELLOW + articlePageNumber + codes.TEXT_WHITE + lines[0]);
                if (lines[1]) feedMenuPage.addContentLine('     ' + lines[1]);
            }
            registerPage(feedMenuPage);
        });
    }
}

// Until we figure out how to access other pages and whether to wire them using a parent attribute in the config files, hardcode a news
// section home page for now...
const sectionParent:Page = new Page('101', 'News main menu');

const feedPageGenerators:[RSSFeedPageGenerator] = feedPageConfig.map(feedConfig => {
    const template = feedConfig.masthead && feedConfig.footerPrefix ?
        new PageTemplate(feedConfig.name, feedConfig.masthead, feedConfig.footerPrefix) :
        new PageTemplate(feedConfig.name);
    return new RSSFeedPageGenerator(template, feedConfig.number, feedConfig.name, feedConfig.feed, feedConfig.articleCopy, sectionParent);
});

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