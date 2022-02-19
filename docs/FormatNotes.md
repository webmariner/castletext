## Some notes on how UK Teletext was encoded over-the-air and in the display memory of a BBC Micro

#### Text Conversion

The web is a more exotic place than the sheltered nostalgia of Teletext can fully reflect in all its splendour.
Ignoring images and video, even text on the web has a lot more going on than could be represented at the time. Even
some of the characters that _could_ be shown back then generally appear on the web with a different codepoint.

As a result, some processing of text taken from the web is required before it can be used to make Teletext pages.
Characters in web text need to be converted so that they appear in as close a form to the one intended as
possible. For characters that can't easily be converted, rather than spitting out a question mark as many tools
do, we will just use a space.

The character set that was used for UK Teletext is defined in ETSI EN 300 706 by the Latin G0 Set and English
sub-set. I'll refer to this as ETSI English below for brevity.

| Decimal codepoint  | 35  | 36  | 64  | 91  | 92  | 93  | 94  | 95  | 96  | 123 | 124    | 125 | 126 |
| ------------------ | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | ------ | --- | --- |
| Hex codepoint      | 23  | 24  | 40  | 5b  | 5c  | 5d  | 5e  | 5f  | 60  | 7b  | 7c     | 7d  | 7e  |
| ETSI English glyph | £   | $   | @   | ←   | ½   | →   | ↑   | #   | ‒   | ¼   | ‖      | ¾   | ÷   |
| 1967 ASCII glyph   | #   | $   | @   | \[  | \\  | \]  | ^   | \_  | \`  | \{  | &#124; | \}  | ~   |

#### Colour and Graphics Control Codes

BBC Micro Mode 7 VDU Codes 128 (\x80) to 255 (\xff) are written to the display RAM as byte values 0 (\x00) to 127 (\x7f)
The control codes shown for VDU 128-159 map to control codes 0 - 31 (\x1f) in ETSI EN 300 706, and VDU 160-255 map
exactly to ETSI English. However not all ETSI control codes are implemented by the BBC Micro (e.g. VDU 128 / ETSI English 0
doesn't give black text), and MODE 7 VDU codes 32 - 126 don't all directly map to the codepoint of the same number in
ETSI English. Also the VDU codes 0 to 31 (\x1f) and 127 (\x7f), as with ASCII, are very different control codes from
those used in videotex/teletext and are interpreted directly by the host OS rather than necessarily ending up encoded
directly into display RAM.

The upshot of all this is that all valid MODE 7 display RAM values fit into 7 bits, with the MSb in the byte not
being used. Where Teletext frames are encoded in base 64, 6 7-bit raw source characters will give exactly 7 base-64
characters, equating to a chunk of 42 bits.

    ETSI English bits 012345601234560123456012345601234560123456... SOURCE
    Base 64      bits 012345012345012345012345012345012345012345... OUTPUT

#### Further details

See the BBC Micro manual Appendix A and p106/7 of ETSI EN 300 706
https://ec.europa.eu/eip/ageing/standards/ict-and-communication/data/etsi-en-300-706_en
