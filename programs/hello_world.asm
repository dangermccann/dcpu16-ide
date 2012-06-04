SET I, data
SET J, 0x300	; start of video ram

:loop
SET B, 0x20	; glyph
SET C, 0	; blink
SET X, 1	; background
SET Y, 0xa	; foreground
JSR make_cell
SET [J], Z
ADD I, 1
ADD J, 1
SET B, data
ADD B, 0x190
IFN I, B
SET PC, loop

SET I, data
SET J, 0x300	; start of video ram

:loop2
SET B, [I]	; glyph
SET C, 0	; blink
SET X, 1	; background
SET Y, 0xa	; foreground
JSR make_cell
SET [J], Z
ADD I, 1
ADD J, 1
IFN [I], 0
SET PC, loop2
:draw
SET B, 0x300	; set start of video ram
SET A, 0		; map video ram
HWI 0			; call monitor, TODO: don't assume ID is 0

JSR noop



:put_char
SET A, 1
SET B, C
SET C, 0	; blink
SET X, 1	; background
SET Y, 0xa	; foreground
JSR make_cell
SET [J], Z
ADD I, 1
ADD J, 1
SET PC, POP

:noop
SET A, 1
HWI 1
IFN C, 0
JSR put_char
SET PC, noop



:make_cell
SET Z, B
SHL C, 0x7
BOR Z, C
SHL X, 0x8
BOR Z, X
SHL Y, 0xC
BOR Z, Y
SET PC, POP
:data dat "hello world", 0
:exit
SET PC, PC