enum Justification {
    None,
    Left,
    Right
}
const justificationFunctions: (((line: string, maxLength: number) => string) | null)[] = [
    null,
    (line, maxLength) => line.padEnd(maxLength),
	(line, maxLength) => line.padStart(maxLength)
];

const BASE_64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
/*
Encoding substitutions.
This maps UTF8 characters to their BBC Micro Mode 7 counterparts
where they differ from vanilla 1967 ASCII (e.g. the BBC Micro uses the
codepoint of ASCII # for the UK pound sign £) or aren't directly
convertible.
*/
const substitutions = {
	'€': 'EUR',
	'¥': 'JPY',
    '°': 'deg',
    '®': '(R)',
    '©': '(C)',
    'Å': 'Aa',
    'å': 'aa',
    'Æ': 'Ae',
    'æ': 'ae',
    'Ĳ': 'Ij',
    'ĳ': 'ij',
    'Œ': 'Oe',
    'Ø': 'Oe',
    'œ': 'oe',
    'ø': 'oe',
    'ß': 'ss',
    'Þ': 'Th',
    'þ': 'th',
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

const getLines = (utf8Text: string, lineMaxLength: number, maxLines: number, justification: Justification):string[] => {
    if (typeof utf8Text !== 'string' || utf8Text.length === 0) return [];
    let text = transcodeUtf8ToBeeb(utf8Text);
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
            lines[l] = justificationFunctions[justification](lines[l], lineMaxLength);
        }
    }
    return lines;
}

/*
Transcodes UTF-8 text (such as might be fetched from web/RSS feeds) to text for BBC Micro display mode 7. Only
outputs printable characters, not control, colour or graphics codes.
*/
const transcodeUtf8ToBeeb = (inputText: string): string => {
    const normalisedInput = inputText.normalize('NFKC');
    let outputCharBuffers = [] as Buffer[];
    for (let utfChar of normalisedInput) {
        let outputBytes = Buffer.from(utfChar);
        if (substitutions[utfChar]) {
            outputBytes = Buffer.from(substitutions[utfChar]);
        } else if (outputBytes.length > 1) {
            // We have a chonky UTF8 character which we haven't found a known substitution
            // for. The only characters we will still try to translate at this point are
            // latin ones with diacritics e.g. ē to e.

            // This did used to use iconv, but it was more hassle than it was worth in this
            // situation given the native dependency and that it doesn't directly support
            // our antiquated target charset ;) iconv-lite doesn't do even basic latin
            // transliteration, so just switching from composed to decomposed form and then
            // stripping diacritics here directly instead. More complex substitutions like
            // æ to ae are already handled above.
            outputBytes = Buffer.from(utfChar.normalize('NFD').replace(/[\u0300-\u036f]/g, ''));
            // If we still don't have an ETSI-friendly 1-byte character, use a
            // space instead
            if (outputBytes.length > 1 || outputBytes[0] > 126 || outputBytes[0] < 32) {
                outputBytes = Buffer.from([0x20]);
            }
        }
        outputCharBuffers.push(outputBytes);
    }
    const outputBuffer = Buffer.concat(outputCharBuffers);
    let beebString = '';
    for (let outChar of outputBuffer) {
        beebString += String.fromCharCode(outChar);
    }
    return beebString;
};

/*
To and from b64 onversion functions lifted from edit.tf
Convert a frame in Base64 to BBC Micro Mode 7 display RAM format
*/
const b64ToMode7RAM = (frame: string): string => {
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
Writes out a raw memory frame as base-64.
*/
const rawToB64 = (raw: string): string => {
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
const rawToJsStringLiteral = (raw: string): string => {
    let literal = '"';
    for (let p = 0; p < raw.length; p++) {
        if (p % 40 === 0 && p > 0) literal += '" + \n"';
        let pchar = raw.charAt(p);
        let pcode = pchar.charCodeAt(0);
        if (pcode > 0x7f) { throw new Error(`Invalid videotex codepoint ${pcode}`) };
        if (pcode < 0x20 || pcode === 0x7f || pcode === 0x22) {
            literal += ('\\u00' + pcode.toString(16).padStart(2, '0'));
        } else {
            literal += pchar;
        }
    }
    literal += '"';
    return literal;
};

export {
    Justification,
    getLines,
    transcodeUtf8ToBeeb,
    b64ToMode7RAM,
    rawToB64,
    rawToJsStringLiteral
};