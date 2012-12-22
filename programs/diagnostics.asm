; DCPU-16 Diagnostics Application 
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

; set the interrupt handler
IAS interrupt_handler

; find clock
SET A, 0xb402
SET B, 0x12d0
SET C, clock_index
JSR find_device

IFE [clock_index], 0xffff   ; if we didn't find a clock, skip to disk discovery
SET PC, find_drive


SET B, 60           ; tick once per second
SET A, 0
HWI [clock_index]   ; turn on clock

:find_drive
SET A, 0x4cae 
SET B, 0x74fa
SET C, drive_index
JSR find_device

IFE [drive_index], 0xffff   ; if we didn't find a drive, skip to main loop
SET PC, main_loop

; invoke UPDATE_DEVICE_FLAGS on disk to set NON_BLOCKING=1 and MEDIA_STATUS_INTERRUPT=1
SET A, 3
SET B, 2
HWI [drive_index]

; invoke SET_INTERRUPT_MESSAGE on disk
SET A, 5
SET B, 0x4cae 
HWI [drive_index]

:main_loop
IFN [clock_index], 0xffff
JSR draw_clock_ticks

IFN [drive_index], 0xffff
JSR query_disk_status

SET PC, main_loop

; A = device ID 1
; B = device ID 2
; C = location to store device index, or 0xffff if not found
:find_device
SET PUSH, Y
SET PUSH, Z
SET [C], 0xffff

SET Z, discovered_devices
SET I, 0

:find_device_loop
SET Y, [Z]
IFE [Y], A
IFE [Y+1], B
SET [C], I
ADD I, 1
ADD Z, 1
IFL I, 16
SET PC, find_device_loop

SET Z, POP
SET Y, POP
SET PC, POP


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

SET A, [known_device_count]
ADD A, 2    ; put clock line one line below last device name
SET B, clock_line
JSR draw_line
SET PC, POP


:query_disk_status
SET A, 0    ; QUERY_MEDIA_PRESENT
HWI, [drive_index]
IFE B, 1
JSR query_media_quality
IFE B, 0    ; if no media present
SET [media_status], media_status_none

IFE [media_status], media_status_available
JSR test_media


; update media status line
SET Z, media_line
ADD Z, 15
SET I, [media_status]
:media_status_message_loop  
SET [Z], [I]    ; copy one character into message
ADD I, 1        ; move to next character
ADD Z, 1
IFN [I], 0      ; check for null termination of status string
SET PC, media_status_message_loop

SET A, [known_device_count]
ADD A, 3    ; put media status line below clock line
SET B, media_line
SET X, 0    ; set foreground and background colors
SET Y, 0xf
JSR draw_line


SET PC, POP


:query_media_quality
SET A, 0xffff    ; QUERY_MEDIA_QUALITY
HWI [drive_index]
IFE A, 0    ; ERROR_NONE
SET [media_status], media_status_available
IFN A, 0    ; some error 
SET [media_status], media_status_error

SET PC, POP


:test_media
IFE [media_test_state], 1 ; bail if we are in progress 
SET PC, POP
IFE [media_test_state], 2 ; bail if we are  finished with the test
SET PC, POP

SET [media_test_state], 1 ; set status to in progress

SET Y, media_test_pending
JSR draw_media_test_line

; read a few sectors from the media
SET A, 0x10 ; READ_SECTORS
SET B, 0x10 ; inital sector
SET C, 16   ; number of sectors
SET X, 0x2048 ; memory offset to place result into
HWI, [drive_index]
SET PC, POP ; return

:interrupt_handler
IFE A, 0x4cae 
JSR media_interrupt_handler
RFI A

:media_interrupt_handler
SET PUSH, B
SET PUSH, C
SET PUSH, I
SET PUSH, J
SET PUSH, X
SET PUSH, Y
SET PUSH, Z

SET A, 4; QUERY_INTERRUPT_TYPE
HWI, [drive_index]

IFE B, 1 ;  MEDIA_STATUS
SET [media_test_state], 0 ; media status changed, reset state

; bail if this is not the read complete message
IFN B, 2 ; READ_COMPLETE
SET PC, exit_media_interrupt_handler

IFE A, 0 ; no error
SET Y, media_test_success

IFN A, 0 ; error
SET Y, media_test_fail

JSR draw_media_test_line

:exit_media_interrupt_handler
SET Z, POP
SET Y, POP
SET X, POP
SET J, POP
SET I, POP
SET C, POP
SET B, POP
SET PC, POP

; Y = address of message to display
:draw_media_test_line
SET Z, media_test_line
ADD Z, 15
SET I, Y
:draw_media_test_line_loop  
SET [Z], [I]    ; copy one character into message
ADD I, 1        ; move to next character
ADD Z, 1
IFN [I], 0      ; check for null termination of status string
SET PC, draw_media_test_line_loop

SET A, [known_device_count]
ADD A, 4    ; put media test line below status line
SET B, media_test_line
SET X, 0    ; set foreground and background colors
SET Y, 0xf
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

:top_line DAT           "===== DCPU-16 Diagnostics ======", 0
:second_line DAT        " Discovered hardware:           ", 0
:clock_line DAT         " Clock time:                    ", 0
:media_line DAT         " Media status:                  ", 0
:media_test_line DAT    " Media test:                    ", 0

:media_status_available DAT "available", 0
:media_status_none      DAT "none     ", 0
:media_status_error     DAT "ERROR    ", 0
:media_status DAT 0xffff

:media_test_success DAT "success    ", 0
:media_test_fail    DAT "failed     ", 0
:media_test_pending DAT "in progress", 0


; 35 bytes each
:known_devices
DAT 0xf615, 0x7349, "  X. LEM-1802 Monitor           ", 0
DAT 0x7406, 0x30cf, "  X. Generic Keyboard           ", 0
DAT 0xb402, 0x12d0, "  X. Generic Clock              ", 0
DAT 0x4cae, 0x74fa, "  X. HMD2043 Harold Media Drive ", 0
DAT 0xbf3c, 0x42ba, "  X. SPED3 Display              ", 0

:known_device_count
DAT 5

:clock_index
DAT 0xffff

:drive_index
DAT 0xffff

; 0 = haven't started, 0 = in progress, 2 = done
:media_test_state
DAT 0

:last_clock_time DAT 0

:discovered_devices
DAT 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0 


