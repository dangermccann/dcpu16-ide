:init_glyphs
set [0x8180+i], [code+i]
add i, 1
ifg 46*2, i
set pc, init_glyphs
set z, 0x1234 ; rand_seed
set y, z ; cur_rand
set pc, main_loop
:next_rand
mul y, 10061
add y, 1
set pc, pop
:main_loop
set i, 0
set x, y
set y, z
set a, 0x8000
:next_row1
  set j, 0
  :next_char1
    jsr next_rand
    ife [a], 0
    set pc, skip1
    ifb y, 0x7000
    set pc, skip1
    ; mutate char at [a] (j, i)
    set push, y
    set y, x
    jsr next_rand
    and [a], 0xff00 ; reset char
    mod y, 46
    bor [a], y ; set letter
    set x, y
    set y, pop
    
    :skip1
    add j, 1
    add a, 1
    ifg 32, j
    set pc, next_char1
  add i, 1
  ifg 12, i
  set pc, next_row1
set y, x
; step 2: move all columns down
set i, 11
set a, 0x815f
:next_row2
  set j, 32
  :next_char2
    ife [a], 0
    set pc, empty_char
    ifb [a+32], 0xffff
    set pc, move_down
    ; add new char at [a+32] (j, i+1)
    jsr next_rand
    set [a+32], [a]
    and [a+32], 0xff00
    set x, y
    mod x, 46
    bor [a+32], x
    and [a], 0x7fff
    set pc, skip2
    
    :empty_char
    set [a+32], 0
    :move_down
    and [a+32], 0x7fff
    :skip2
    sub j, 1
    sub a, 1
    ifg j, 0
    set pc, next_char2
  sub i, 1
  ifg i, 0
  set pc, next_row2
set y, x
; step 3: update top layer
set a, 0x8000
set j, 0
:next_char3
  jsr next_rand
  ifb y, 0x0700
  set pc, skip3
  ifb [a], 0xffff
  set pc, empty_char2
  
  set [a], 0x2000
  ifb y, 0x0800
  set [a], 0xa000
  set x, y
  mod x, 46
  bor [a], x
  set pc, skip3
  :empty_char2
  set [a], 0
  :skip3
  add j, 1
  add a, 1
  ifg 32, j
  set pc, next_char3
set PC, main_loop
sub PC, 1
; new glyphs, 46 for now
:code dat 0x7c82, 0x7c00, 0x04fe, 0x0000, 0x8cb2, 0xc200, 0x84a2, 0xdc00, 0x3824, 0xfe00, 0x728a, 0x4e00, 0x0272, 0x0e00, 0x3649, 0x3600, 0x7c92, 0x8c00, 0x8000, 0x8000, 0x2810, 0x2800, 0x007f, 0x0000, 0x1010, 0x1000, 0x287c, 0x2800, 0x0080, 0x0000, 0x0088, 0x0000, 0x1038, 0x1000, 0x1028, 0x4400, 0x0000, 0xee00, 0x0028, 0x2800, 0x4428, 0x1000, 0x8282, 0x8200, 0x0c00, 0x0c00, 0x8452, 0x4a00, 0xfe82, 0x8000, 0x1e72, 0x9600, 0x1e66, 0x8e00, 0x3e40, 0x8e00, 0x3c48, 0x9c00, 0x3e42, 0x8600, 0x3a4a, 0x8a00, 0x0a7a, 0x8e10, 0xfe6a, 0x8a00, 0xfc0e, 0x7480, 0x8a8e, 0x7a00, 0xe28c, 0xf000, 0x8888, 0x7e00, 0xacf6, 0xa400, 0x9c64, 0x3400, 0xf00e, 0x3e40, 0x74fe, 0xb440, 0x2e72, 0x8a00, 0x1c24, 0x7480, 0x88f8, 0x8800, 0xc2ba, 0x8600, 0x7c54, 0x7c00