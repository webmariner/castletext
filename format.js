const Iconv = require('iconv').Iconv;
let iconv = new Iconv('UTF-8', 'ASCII//TRANSLIT');

const BASE_64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';

exports.getLines = (utf8Text, lineMaxLength, maxLines, justification) => {
	let text = exports.transcodeUtf8ToBeeb(utf8Text);
	let words = text.toString().match(/\S+/g) || [];
	let lines = [];
	let line = '';
	while (words.length > 0) {
		if (line.length == lineMaxLength) {
			lines.push(line);
			line = '';
		}
		let word = words.shift();
		let wordStartToLineEnd = (lineMaxLength - (line.length + Math.min(line.length, 1)));
		let overrun = word.length - wordStartToLineEnd;
		if (overrun > 0) {
			// The word is longer than the space left on the current line
			// firstPart: the part of the word that would still fit
			let firstPart = word.substring(0,wordStartToLineEnd);
			if (firstPart.lastIndexOf('-') > 0) {
				// There's already a hyphen in the firstPart
				words.unshift(word.substring(firstPart.lastIndexOf('-')+1));
				word = firstPart.substring(0,firstPart.lastIndexOf('-')+1);
			} else if (wordStartToLineEnd > 4 && word.length > 7) {
				// Hyphenate if the word is long enough and enough space would be lost
				words.unshift(word.substring(wordStartToLineEnd-1));
				word = word.substring(0,wordStartToLineEnd-1)+'-';
			} else {
				// Bump the word down to the next line
				lines.push(line);
				line = '';
			}
		}
		line = line + ((line.length > 0) ? ' ' : '') + word;
	}
	if (line) lines.push(line);
	if (maxLines && lines.length > maxLines) {
		lines = lines.slice(0,maxLines);
		let truncatedLine = maxLines - 1;
		let truncatedText = lines[truncatedLine];
		if (truncatedText.length + 3 > lineMaxLength || truncatedText.endsWith('-')) {
			truncatedText = truncatedText.
				substring(0,Math.min(truncatedText.length - 1, lineMaxLength - 3)) +
				'...';
		} else {
			truncatedText = truncatedText + '...';
		}
		lines[truncatedLine] = truncatedText;
	}
	if (justification) {
		for (let l = 0; l<lines.length; l++) {
			lines[l] = justification(lines[l], lineMaxLength);
		}
	}
	return lines;
}



/*
Technical notes
---------------
BBC Mode 7 VDU Codes 128 (\x80) to 255 (\xff) are written to the display RAM as byte values 0 (\x00) to 127 (\x7f)
The control codes shown for VDU 128-159 map to control codes 0 - 31 (\x1f) in ETSI EN 300 706, and VDU 160-255 map
exactly to ETSI's Latin G0 character set (English option subset). However not all ETSI control codes are
implemented by the BBC Micro (e.g. VDU 128 / ETSI 0) doesn't give black text), and MODE 7 VDU codes 32 - 126 don't
all directly map to the codepoint of the same number in ETSI. Also the VDU codes 0 to 31 (\x1f) and 127 (\x7f), as
with ASCII, are very different control codes from those used in videotex/teletext and are interpreted directly by
the host OS rather than necessarily ending up encoded directly into display RAM.

The upshot of all this is that all valid MODE 7 display RAM values fit into 7 bits, with the MSb in the byte not
being used.

See the BBC Micro manual Appendix A and p106/7 of ETSI EN 300 706
https://ec.europa.eu/eip/ageing/standards/ict-and-communication/data/etsi-en-300-706_en

Decimal		35	36	64	91	92	93	94	95	96	123	124	125	126
Hex			23	24	40	5b	5c	5d	5e	5f	60	7b	7c	7d	7e
ETSI Englsh	£	$	@	←	½	→	↑	#	‒	¼	‖	¾	÷
1967 ASCII	#	$	@	[	\	]	^	_	`	{	|	}	~


This maps UTF characters to their BBC Micro Mode 7 counterparts
where they differ from vanilla 1967 ASCII (e.g. the BBC Micro uses the
codepoint of ASCII # for the UK pound sign £). Hoping iconv will cope with
everything else!
*/
const exceptions = {
	'€': 'EUR',
	'¥': 'JPY',
	'μ': 'u',
	'‐': '-',
	'‑': '-',
	'‒': '`',
	'–': '`',
	'—': '`',
	'―': '`',
	'_': '`',
	'£': '#',
	'#': '_',
	'`': '\'',
	'‘': '\'',
	'’': '\'',
	'“': '"',
	'”': '"',
	'\\': '/',
	'[': '(',
	']': ')',
	'←': '[',
	'→': ']',
	'↑': '^',
	'½': '\\',
	'¼': '{',
	'¾': '}',
	'~': 'approx.',
	'÷': '~',
	'‖': '|',
	'ǀ': '|'
};

/*
Transcodes UTF-8 text (such as might be fetched from web/RSS feeds) to
text for BBC Micro display mode 7.
*/
exports.transcodeUtf8ToBeeb = (inputText) => {
	let beebVersion = "";
	for (char of inputText.normalize('NFKD')) {
		if (exceptions[char]) {
			beebVersion += exceptions[char];
		} else {
			try {
				beebVersion += iconv.convert(char);
			} catch (error) {
				//These crop up a lot :) commenting out for now...
				//console.error(`Hit a problem trying to convert the text: ${inputText}`);
				//console.error(error);
				//console.error(`Character: ${char}, codepoint ${char.charCodeAt(0).toString(16)}`)
			}
		}
	}
	return beebVersion;
};

/*
To and from b64 onversion functions lifted from edit.tf

Convert a frame in Base64 to BBC Micro Mode 7 display RAM format
*/
exports.b64ToMode7RAM = (frame) => {
	let currentcode = 0;
	let rawOutput = '';
	for (let p = 0; p < frame.length; p++) {
		let pc = frame.charAt(p);
		let pc_dec = BASE_64.indexOf(pc);
		for (let b = 0; b < 6; b++) {
			let charbit = (6*p + b) % 7;
			let b64bit = pc_dec & (1 << (5 - b) );
			if (b64bit > 0) {
				b64bit = 1;
			}
			currentcode |= b64bit << (6 - charbit);
			if (charbit == 6) {
				// we have all the bits for a complete character code!
				rawOutput += String.fromCharCode(currentcode);
				currentcode = 0;
			}
		}
	}
	return rawOutput;
};

/*
Writes out a raw memory frame as base-64. 6x7-bit raw source characters will give
exactly 7xbase-64 characters, equating to a chunk of 42 bits.

ETSI bits 012345601234560123456012345601234560123456... SOURCE
b64  bits 012345012345012345012345012345012345012345... OUTPUT
*/
exports.rawToB64 = (raw) => {
	let sextets = [];
	let encoding = '';
	for ( let i = 0; i < 1167; i++ ) {
		sextets[i] = 0;
	}
	for ( let p=0; p<raw.length; p++) {
		for ( let b=0; b<7; b++ ) {

			// How many bits into the frame information we
			// are.
			const framebit = 7 * p + b;

			// Work out the position of the character in the
			// base-64 encoding and the bit in that position.
			const b64bitoffset = framebit % 6;
			const b64charoffset = ( framebit - b64bitoffset ) / 6;

			// Read a bit and write a bit.
			var bitval = raw.charCodeAt(p) & ( 1 << ( 6 - b ));
			if ( bitval > 0 ) { bitval = 1; }
			sextets[b64charoffset] |= bitval << ( 5 - b64bitoffset );
		}
	}
	for ( var i = 0; i < 1167; i++ ) {
		encoding += BASE_64.charAt(sextets[i]);
	}
	return encoding;
}

/*
Writes out a raw memory frame as a JavaScript literal string.
Escapes any Mode 7 control codes and the double quote mark.
*/
exports.rawToJsStringLiteral = (raw) => {
	let literal = "'";
	for (let p = 0; p < raw.length; p++) {
		if (p % 40 === 0 && p > 0) literal += "' + \n'"
		let pchar = raw.charAt(p);
		let pcode = pchar.charCodeAt(0);
		if (pcode > 0x7f) { throw new Error(`Invalid videotex codepoint ${pcode}`) };
		if (pcode < 0x20 || pcode === 0x7f || pcode === 0x27) {
			literal += ('\\x' + pcode.toString(16).padStart(2, '0'));
		} else {
			literal += pchar;
		}
	}
	literal += "'";
	return literal;
};

exports.justifyTypes = {
	LEFT_JUSTIFY: (line, maxLength) => line.padEnd(maxLength),
	RIGHT_JUSTIFY: (line, maxLength) => line.padStart(maxLength)
}
