SET I, data
SET J, 0x300

:loop
SET B, 0x20
SET C, 0
SET X, 1
SET Y, 0xa
JSR make_cell
SET [J], Z
ADD I, 1
ADD J, 1
SET A, loop
SET B, data
ADD B, 0x190
IFN I, B
SET PC, A

SET I, data
SET J, 0x300

:loop2
SET B, [I]
SET C, 0
SET X, 1
SET Y, 0xa
JSR make_cell
SET [J], Z
ADD I, 1
ADD J, 1
SET A, loop2
IFN [I], 0
SET PC, A
:draw
SET B, 0x300
SET A, 0
HWI 0

JSR exit

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