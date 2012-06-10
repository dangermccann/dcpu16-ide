; DCPU-16 Dianostics Application 
; Copyright (c) 2012 John McCann
; 
; Performs device discovery and displays clock time.
; 


JSR device_discovery

; welcome message
SET X, 0
SET Y, 3
SET A, 0
SET B, top_line
JSR draw_line

SET X, 0    ; change colors
SET Y, 0xf
SET A, 1
SET B, second_line
JSR draw_line


SET I, 0    ; counter for device_draw_loop

:device_draw_loop
SET A, I
ADD A, 2    ; start on the third line
IFN [discovered_devices + I], 0
JSR draw_device
ADD I, 1
IFN I, 16       ; support displying up to 16 devices
SET PC, device_draw_loop

; locate clock index
SET Z, discovered_devices
SET I, 0

:find_clock_loop
SET C, [Z]
IFE [C], 0xb402
IFE [C+1], 0x12d0
SET [clock_index], I
ADD I, 1
ADD Z, 1
IFL I, 16
SET PC, find_clock_loop

IFE [clock_index], 0xffff   ; if we didn't find a clock, skip to main loop
SET PC, main_loop


SET B, 60           ; tick once per second
SET A, 0
HWI [clock_index]   ; turn on clock


:main_loop
IFN [clock_index], 0xffff
JSR draw_clock_ticks
SET PC, main_loop


:draw_clock_ticks
SET A, 1
HWI [clock_index]   ; get clock ticks since last call
IFE C, [last_clock_time]
SET PC, POP

SET A, C
SET [last_clock_time], C
SET B, clock_line
ADD B, 13
JSR itoa            ; put ticks into string

SET A, 6
SET B, clock_line
JSR draw_line
SET PC, POP


; device discovery
:device_discovery
HWN I
:device_loop
SUB I, 1
HWQ I

SET J, known_devices
SET Z, 0    ; counter for inner loop

:device_loop2
IFE A, [J]  ; compare the device ID with the known device IDs
IFE B, [J+1]
SET [discovered_devices + I], J
ADD J, 35   ; move J to location of next device in known_devices

ADD Z, 1
IFN Z, [known_device_count]   ; continue in inner loop for each known device
SET PC, device_loop2

IFE I, 0    ; if we've reached the end of devices, return
SET PC, POP
SET PC, device_loop

 
:draw_device 
SET B, [discovered_devices + I]
ADD B, 2        ; offset to beginning of device name
SET Z, I        ; put index Z
ADD Z, 1        
ADD Z, 0x30     ; for ASCII representation of number
SET [B+2], Z    ; insert index character into string
JSR draw_line
SET PC, POP

; Writes a null terminated string to the display
; A = line number
; B = pointer to memory location of string
; X foreground color
; Y background color
:draw_line
SET PUSH, X     ; save registers we plan to change
SET PUSH, Y
SET PUSH, A
MUL A, 32
ADD A, [video_ram]
SHL X, 0x8
SHL Y, 0xC
BOR X, Y    ; we will BOR X with each char

:draw_line_loop
SET [A], [B]    ; set char in video ram
BOR [A], X      ; BOR with fg and bg colors
ADD B, 1
ADD A, 1
IFN [B], 0      ; check for a null
SET PC, draw_line_loop

SET A, POP
SET Y, POP
SET X, POP
SET PC, POP

; itoa - converts an integer to a string
; A = integer to convert
; B = memory location to store result
:itoa
SET PUSH, A
SET PUSH, B
SET PUSH, X
SET PUSH, J

SET J, 0

:itoa_loop1
SET X, A
MOD X, 10
SET PUSH, X
DIV A, 10
ADD J, 1
IFG A, 0
SET PC, itoa_loop1

:itoa_loop2
SET [B], POP
ADD [B], 0x30
SUB J, 1
ADD B, 1
IFG J, 0
SET PC, itoa_loop2

SET J, POP
SET X, POP
SET B, POP
SET A, POP
SET PC, POP



:video_ram
DAT 0x8000

:top_line DAT       "===== DCPU-16 Diagnostics ======", 0
:second_line DAT    " Discovered hardware:           ", 0
:clock_line DAT     " Clock time:                    ", 0

; 35 bytes each
:known_devices
DAT 0xf615, 0x7349, "  X. LEM-1802 Monitor           ", 0
DAT 0x7406, 0x30cf, "  X. Generic Keyboard           ", 0
DAT 0xb402, 0x12d0, "  X. Generic Clock              ", 0

:known_device_count
DAT 3

:clock_index
DAT 0xffff

:last_clock_time DAT 0

:discovered_devices
DAT 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0 


