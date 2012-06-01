SET A, 0
SET [xmax], [xsize]
SUB [xmax], 2
SET [ymax], [ysize]
SUB [ymax], 2
JSR clearScreen
:main
  IFE A, 0x0300
    JSR update
  ADD A, 1
  SET PC, main
:update
  SET B, ballData
  SET C, 0
  :ballLoop
    JSR moveBall
    ADD B, [ballSize]
    ADD C, 1
    IFG [numBalls], C
      SET PC, ballLoop
  SET PC, POP
:moveBall
  SET [ballx], [B]
  SET [bally], [1+B]
  SET [ballvx], [2+B]
  SET [ballvy], [3+B]
  SET Z, 0x0000
  JSR drawBall
  IFE [ballvx], 1
    ADD [ballx], 1
  IFE [ballvx], 0
    SUB [ballx], 1
  IFE [ballvy], 1
    ADD [bally], 1
  IFE [ballvy], 0
    SUB [bally], 1
  IFE [ballx], [xmax]
    XOR [ballvx], 1
  IFE [ballx], 0
    XOR [ballvx], 1
  IFE [bally], [ymax]
    XOR [ballvy], 1
  IFE [bally], 0
    XOR [ballvy], 1
  SET [B], [ballx]
  SET [1+B], [bally]
  SET [2+B], [ballvx]
  SET [3+B], [ballvy]
  SET Z, [4+B]
  JSR drawBall
  SET A, 0
  SET PC, POP
:drawBall
  SET X, [ballx]
  SET Y, [bally]
  JSR writeChar
  ADD X, 1
  JSR writeChar
  ADD Y, 1
  JSR writeChar
  SUB X, 1
  JSR writeChar
  SET PC, POP
:writeChar
  SET J, Y
  MUL J, 32
  ADD J, X
  ADD J, 0x8000
  SET [J], Z
  SET PC, POP
:clearScreen
  SET Z, 0x0000
  SET X, 0
  :loopx
    SET Y, 0
    :loopy
      JSR writeChar
      ADD Y, 1
      IFG [ysize], y
        SET PC, loopy
    ADD X, 1
    IFG [xsize], x
      SET PC, loopx
  SET PC, POP
:end SUB PC, 1
:ballData
;   X   Y   vX  vY  color
DAT 3,  4,  1,  1,  0x0900
DAT 7,  6,  1,  0,  0x0A00
DAT 19, 3,  0,  0,  0x0E00
DAT 27, 8,  0,  1,  0x0C00
:numBalls DAT 4
:ballSize DAT 5
:ballx DAT 0
:bally DAT 0
:ballvx DAT 0
:ballvy DAT 0
:xmax DAT 0
:ymax DAT 0
:xsize DAT 32
:ysize DAT 16