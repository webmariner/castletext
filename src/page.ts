import moment from 'moment';
import * as codes from './teletext_codes.json';
import { b64ToMode7RAM, rawToB64, rawToJsStringLiteral } from './format';

enum FrameFormat {
    Mode7 = 1,
    EditTF = 2,
    JSLiteral = 3,
}

/**
 * Page
 * 
 * Represents a carousel of one or more frames, where a frame is a grid
 * of Teletext characters and/or display codes. Each page has a number,
 * which is used by the user to select or recall the page for viewing.
 * A page can also have a name, for example to allow other pages to
 * refer to them, or for logging purposes.
 */
class Page {
    /**
     * In CastleText the page number is a three-digit hexadecimal number.
     * The number is stored as a string to allow compatibility
     * with JSON.
    */
    readonly pageNumber:string;
    /**
     * The page name - for reference in logs or when a generated page
     * needs to refer back up to a parent menu page
     */
    readonly name:string;

    protected _rawFrames:string[];

    get rawFrames():string[] {
        return this._rawFrames;
    }

    constructor(pageNumber:string, name:string = 'Unnamed Section') {
        this.pageNumber = pageNumber;
        this.name = name;
    }

    getDisplayFrame(index:number, outputFormat:FrameFormat = FrameFormat.Mode7) {
        const currentDate = moment().format('ddd DD MMM Y' + codes.TEXT_YELLOW + 'HH:mm.ss');
	    const header = `P${this.pageNumber}${codes.TEXT_MAGENTA}EMF-Ceefax${codes.TEXT_CYAN}${currentDate}`;
        const displayFrame = header + this.rawFrames[index];
        switch (outputFormat) {
            case FrameFormat.Mode7:
                return displayFrame;
            case FrameFormat.JSLiteral:
                return rawToJsStringLiteral(displayFrame);
            case FrameFormat.EditTF:
                return rawToB64(displayFrame);
        }
    }
}

/**
 * StaticPage
 * 
 * Represents a Teletext page which has content fixed when the server starts.
 * 
 * Static pages are an array of one or more display frames provided in edit.tf
 * format. The format consists of a frame of 25 rows of 40 7-bit Teletext codes/
 * characters, which are then base-64 encoded (6 bits per b64 character).
 * 
 * This class converts the edit.tf format frames into strings where each
 * character is a Teletext code/character, and removes the first line/row of
 * the frame if there are 25 rows, so that we can add our own header line.
 * Frames without the header line at the top are referred to as 'raw' frames.
 */
class StaticPage extends Page {
    constructor(pageNumber:string, editTfFrames:string[], name?:string) {
        super(pageNumber, name);
        const rawFrames = [];
        for (const editTfFrame of editTfFrames) {
            const headedFrame = b64ToMode7RAM(editTfFrame);
            if (headedFrame.length === (24 * 40)) {
                // Static frame only had 24 lines which isn't typical, but means we
                // can just take all of them for content.
                rawFrames.push(headedFrame);
            } else if (headedFrame.length === (25 * 40)) {
                // Static frame included a header line, as expected. Strip this, i.e.
                // just keep the bottom 24 lines of the static frame, as CastleText
                // will include its own header line at the top.
                rawFrames.push(headedFrame.slice(-(24 * 40)));
            } else {
                console.log(`Static frame for P${this.pageNumber} had unexpected length, skipping...`);
            }
        }
        this._rawFrames = rawFrames;
    }
}

class PageTemplate {
    readonly masthead:string;
    readonly footerPrefix:string;
    constructor(sectionName:string, masthead?:string, footerPrefix?:string) {
        if (masthead && footerPrefix) {
            this.masthead = masthead;
            this.footerPrefix = footerPrefix;
        } else {
            var masthead:string = (codes.TEXT_BLUE + codes.NEW_BACKGRD + codes.DOUBLE_HEIGHT + codes.TEXT_WHITE + '>' + codes.TEXT_CYAN + sectionName).padEnd(40);
            masthead += masthead;
            masthead = masthead + (codes.GFX_BLUE + codes.NEW_BACKGRD).padEnd(40);
            this.masthead = masthead;
            this.footerPrefix = codes.TEXT_BLUE + codes.NEW_BACKGRD + codes.TEXT_CYAN;
        }
    }
}

class GeneratedPage extends Page {
    readonly parent:Page;
    readonly template:PageTemplate;
    protected lines:string[] = [];

    constructor(pageNumber:string, parent:Page, template:PageTemplate, name?:string) {
        super(pageNumber, name);
        this.parent = parent;
        this.template = template;
    }

    addContentLine(line:string):void {
        this.lines.push(line);
    }

    protected getContentFrames():string[] {
        const CONTENT_FRAME_HEIGHT = 18;
        let contentFrames = [];
        let contentFrame = '';
        let frameLinesLeft = CONTENT_FRAME_HEIGHT;
        for (let line = 0; line < this.lines.length; line++) {
            if (frameLinesLeft === CONTENT_FRAME_HEIGHT && this.lines[line] === codes.BLANK_LINE) {
                // Ignore this blank line as we're at the top of a new frame
            } else {
                contentFrame += this.lines[line];
            }
            if (line === (this.lines.length - 1)) {
                // We've used the last content line, so fill any remaining frame space with blank lines
                while ((contentFrame.length / 40) < CONTENT_FRAME_HEIGHT) contentFrame += codes.BLANK_LINE;
            }
            frameLinesLeft = CONTENT_FRAME_HEIGHT - (Math.trunc(contentFrame.length / 40));
            if (frameLinesLeft === 0) {
                // We've completed a content frame
                contentFrames.push(contentFrame);
                contentFrame = '';
                frameLinesLeft = CONTENT_FRAME_HEIGHT;
            }
        }
        return contentFrames;
    }

    /**
     * Get raw frames for this page.
     * 
     * A raw frame is an uncompressed array of BBC Mode 7/Teletext characters,
     * representing 24 display lines, each of 40 characters.
     * 
     * The display is 25 lines high - these raw frames don't include the
     * header line with the time and date at the top of the display.
     */
    get rawFrames():string[] {
        const contentFrames = this.getContentFrames();
        let rawFrames = [];
        for (let f = 0; f < contentFrames.length; f++) {
            let output = this.template.masthead;
            // Top pagination line, just below masthead
            if (contentFrames.length > 1) {
                output += `${codes.TEXT_CYAN}${f + 1}/${contentFrames.length}`.padStart(40);
            } else {
                output += codes.BLANK_LINE;
            }
            // Frame content lines
            output += contentFrames[f];
            // Bottom pagination line, just above footer line
            if (f < contentFrames.length - 1) {
                output += `${codes.TEXT_CYAN}contd...`.padStart(40);
            } else {
                output += codes.BLANK_LINE;
            }
            // Footer line
            let footer = '';
            footer += this.template.footerPrefix;
            footer += this.parent.name;
            footer = footer.padEnd(36);
            footer += this.parent.pageNumber;
            footer += ' ';
            output += footer;
            // Fully rendered raw frame complete, add to the array
            rawFrames.push(output);
        }
        this._rawFrames = rawFrames;
        return this._rawFrames;
    }
    
    set rawFrames(frames:string[]) {
        this._rawFrames = frames;
    }
}

export {
    Page,
    StaticPage,
    GeneratedPage,
    PageTemplate,
    FrameFormat
}