const codes = require('../teletext_codes');
module.exports = [
	{
		number: '110',
		feed: 'http://feeds.bbci.co.uk/news/rss.xml',
		name: 'BBC Main News',
		masthead:
			'\x17\x60\x70\x70\x70\x60\x70\x70\x70\x60\x70\x70\x70\x14\x7c\x7c\x3c\x7c\x3c\x7c\x2c\x7c\x6c\x6c\x3c\x7c\x6c\x3c\x3c\x2c\x3c\x7c\x6c\x3c\x3c\x2c\x7c\x7c\x7c\x7c' +
			'\x17\x6a\x20\x24\x7a\x6a\x20\x24\x7a\x6a\x20\x74\x7a\x14\x1d\x13\x6a\x64\x6e\x68\x73\x34\x35\x7d\x7a\x20\x7d\x7a\x6a\x73\x6a\x30\x35\x7a\x6a\x73\x20\x20\x20\x20' +
			'\x17\x6a\x70\x71\x7a\x6a\x70\x71\x7a\x6a\x70\x71\x7a\x14\x1d\x13\x2a\x20\x2a\x2a\x20\x25\x25\x25\x2b\x20\x25\x2b\x2a\x2c\x20\x2d\x29\x25\x28\x2e\x20\x20\x20\x20',
		footerPrefix: codes.TEXT_BLUE + codes.NEW_BACKGRD + codes.TEXT_WHITE,
		articleCopy: '#page div.story-body__inner>p,div[data-component="text-block"]>div,div[data-component$="list-block"]>div li'
	},
	{
		number: '120',
		feed: 'http://www.independent.co.uk/news/rss',
		name: 'Independent UK',
		masthead:
			'\x11\x60\x7c\x77\x7d\x74\x17INDEPENDENT                      ' +
			'\x11\x6a\x7f\x34\x7f\x7f\x17\x3d\x38\x35\x76\x79\x6a\x6a\x74\x35\x6a\x74\x35\x77\x31\x6d\x6a\x68\x25\x77\x31             ' +
			'\x11\x22\x2f\x7c\x3e\x27\x17\x25\x21\x25\x25\x2a\x2a\x2a\x22\x25\x2a\x22\x25\x2d\x24\x22\x27\x27\x20\x2c\x25             ',
		footerPrefix: codes.TEXT_RED + codes.NEW_BACKGRD + codes.TEXT_WHITE,
		articleCopy: '#main p'
	},
	{
		number: '130',
		feed: 'http://feeds.feedburner.com/euronews/en/home/',
		name: 'Euronews',
		masthead:
			'\x17\x1d\x14\x60\x2c\x30\x68  \x34\x60\x2c\x24\x60\x2c\x30\x60\x7c\x7c\x30\x60\x3c\x74\x68\x30\x68\x34\x60\x34\x78\x2c\x74        ' +
			'\x17\x1d\x14\x3d\x2c\x2e\x6a  \x35\x35  \x35 \x6a\x6a\x35\x6a\x35\x7f\x2c\x2e\x22\x7d\x7e\x7d\x7e\x21\x2b\x2c\x74        ' +
			'\x17\x1d\x14\x22\x2c\x21 \x29\x26 \x25  \x22\x2c\x21\x2a\x25\x2a\x25\x22\x2d\x27 \x2a\x25\x2a\x25 \x2b\x2c\x27\x2a\x25      ',
		footerPrefix: codes.TEXT_WHITE + codes.NEW_BACKGRD + codes.TEXT_BLUE,
		articleCopy: 'div.c-article-content>p'
	},
	{
		number: '140',
		feed: 'https://news.google.com/rss/search?q=when:24h+allinurl:reuters.com&ceid=GB:en&hl=en-GB&gl=GB',
		name: 'Reuters Top News',
		masthead:
			'\x11\x1a p,d0\x17\x19p0`p` 0pp0p0p0 p\x07              ' + 
			'\x11\x1ah564}\x17\x19u:j,j 5 5 =$u:*d\x07              ' + 
			'\x11\x1a -r8%\x17\x19%)*,",! % -$%)(&\x07TOP NEWS      ',
		footerPrefix: codes.TEXT_RED + codes.NEW_BACKGRD + codes.TEXT_WHITE,
		articleCopy: 'article>div>div>div>div>p'
	},
	{
		number: '160',
		feed: 'https://www.theregister.co.uk/headlines.atom',
		name: 'Register Headlines',
		masthead:
			'\x01\x1d\x17\x20\x20\x38\x6f\x7d\x30\x20\x07                             ' +
			'\x01\x1d\x17\x60\x7c\x7d\x7f\x7f\x21\x30\x07T H E   R E G I S T E R      ' +
			'\x01\x1d\x17\x6f\x21\x22\x7f\x7d\x3e\x20\x03biting the hand that feeds IT',
		footerPrefix: codes.TEXT_RED + codes.NEW_BACKGRD + codes.TEXT_WHITE,
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
		footerPrefix: codes.TEXT_RED + codes.NEW_BACKGRD + codes.TEXT_WHITE,
		articleCopy: '#body>p'
	},
	{
		number: '180',
		feed: 'http://rss.slashdot.org/Slashdot/slashdot',
		name: 'Slashdot',
		masthead:
			'\x16\x1d\x17 h?  \x07S L A S H D O T                ' + 
			'\x16\x1d\x17`\x7f!`0\x07News for nerds,                ' + 
			'\x16\x1d\x17~% o?\x07stuff that matters             ',
		footerPrefix: codes.TEXT_CYAN + codes.NEW_BACKGRD + codes.TEXT_WHITE,
		articleCopy: 'div.body div.p'
	},
	{
		number: '200',
		feed: 'https://www.theguardian.com/uk/rss',
		name: 'The Guardian',
		masthead:
			'\x04\x1d\x17x\x27+ ` ` p   00`h4< p  ``             ' + 
			'\x04\x1d\x17\x7f(|&\x7f"\x7f`a} k7i\x27k5|`a}"\x7fk5            ' + 
			'\x04\x1d\x17",\x27 +&\x27"\x27/$.%"-+)/"\x27/,/*-            ',
		footerPrefix: codes.TEXT_BLUE + codes.NEW_BACKGRD + codes.TEXT_WHITE,
		articleCopy: 'div.content__article-body>p,div.content__article-body>p,div.article-body-commercial-selector>p'
	},
	{
		number: '210',
		feed: 'https://www.independent.ie/rss/',
		name: 'Irish Independent',
		masthead:
			'\x07\x1d\x12<<<|                                 ' + 
			'\x07\x1d\x125u}%\x04Independent.ie                  ' + 
			'\x07\x1d\x12)/!                                  ',
		footerPrefix: codes.TEXT_WHITE + codes.NEW_BACKGRD + codes.TEXT_BLUE,
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
		footerPrefix: codes.TEXT_BLUE + codes.NEW_BACKGRD + codes.TEXT_WHITE,
		articleCopy: '#page div.story-body__inner>p,div[data-component="text-block"]>div'
	},
	{
		number: '230',
		feed: 'http://feeds.bbci.co.uk/news/technology/rss.xml',
		name: 'BBC Tech News',
		masthead:
			'\x17`ppp`ppp`ppp\x14||,l,l<ll<|l<<,<|l<<,|||||' +
			'\x17j $zj $zj tz\x14\x1d\x13k!w16!uz }zjsj05zjs     ' +
			'\x17jpqzjpqzjpqz\x14\x1d\x13* -$)$%* %+*, -)%(.     ',
		footerPrefix: codes.TEXT_BLUE + codes.NEW_BACKGRD + codes.TEXT_WHITE,
		articleCopy: '#page div.story-body__inner>p,div[data-component="text-block"]>div'
	},
	{
		number: '250',
		feed: 'https://newsthump.com/feed/',
		name: 'Newsthump',
		masthead:
			'\x01\x1d\x17\x1ath p 0  0`p(l,h                     ' + 
			'\x01\x1d\x17\x1a7~j,%mjh%)l j j#45jj#7ij#4          ' + 
			'\x01\x1d\x17\x1a!" # "## #! " " !"!" !"j#           ',
		footerPrefix: codes.TEXT_RED + codes.NEW_BACKGRD + codes.TEXT_WHITE,
		articleCopy: 'div.entry-content>p'
	},
	{
		number: '260',
		feed: 'https://rss.nytimes.com/services/xml/rss/nyt/HomePage.xml',
		name: 'New York Times',
		articleCopy: 'div.StoryBodyCompanionColumn>div>p'
	},
	{
		number: '270',
		feed: 'https://rss.nytimes.com/services/xml/rss/nyt/World.xml',
		name: 'New York Times - World',
		articleCopy: 'div.StoryBodyCompanionColumn>div>p'
	},
	{
		number: '280',
		feed: 'https://www.thenational.scot/news/rss/',
		name: 'The National (Scotland)',
		articleCopy: 'div.article-body p'
	},
	{
		number: '290',
		feed: 'https://www.walesonline.co.uk/news/?service=rss',
		name: 'Western Mail (Wales)',
		articleCopy: 'div.article-body p'
	}
]