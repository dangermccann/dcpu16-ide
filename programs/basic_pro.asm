;TODO: Tidy code, Add keyboard input at prompt.
set c,0x0ba0
:start
set i,0
:setbordertop
set [0x8000+i],c
add i,1
ife i,0x20
set i,0x160
ife i,0x180
set pc,bordertopdone
set pc,setbordertop
:bordertopdone
set i,0x0020
:borderside
set [0x8000+i],c
add i,0x20
ife i ,0x180
set pc,right
ife i ,0x17f
set pc,clrmainscreen
set pc,borderside
:right
set i,0x003f
set pc,borderside
:clrmainscreen
set i,0x21
set c,0x03a0
:loop
set [0x8000+i],c
add i,1
ife i,0x3f
add i,2
ife i,0x5f
add i,2
ife i,0x7f
add i,2
ife i,0x9f
add i,2
ife i,0xbf
add i,2
ife i,0xdf
add i,2
ife i,0xff
add i,2
ife i,0x11f
add i,2
ife i,0x13f
add i,2
ife i,0x15f
set pc,dotxt
set pc,loop
:dotxt
set c,0xb300
set i,0x21
set j,txt1
set y,24
set x,3
jsr draw
set i,0x41
set j,txt2
set y,28
set x,1
jsr draw
set i,0x61
set j,txt3
set y,19
set x,6
jsr draw
set i,0xa1
set j,txt4
set y,6
set x,0
jsr draw
set pc,done
:draw
add i,x
:drawloop
add [j],c
set [0x8000+i],[j]
add i,1
add j,1
sub y,1
ife y,0
set pc,pop
set pc,drawloop
:done
set pc,done
;ADD HERE
:txt1
dat "**** BASIC PRO 2000 ****"
:txt2
dat "Copyright 1984 Mojang, Earth"
:txt3
dat "64k RAM    40k FREE"
:txt4
dat "Ready."
