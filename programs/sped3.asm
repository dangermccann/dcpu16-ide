
JSR device_discovery

; find clock
SET A, 0xb402
SET B, 0x12d0
SET C, clock_index
JSR find_device

; set up clock
SET B, 60           ; tick once per second
SET A, 0
HWI [clock_index]   ; turn on clock

; find SPED3 index
SET A, 0xbf3c
SET B, 0x42ba
SET C, sped3_index
JSR find_device

; poll SPEC3 device
SET A, 0
HWI [sped3_index]

; map region
SET A, 1
SET X, vertex_data
SET Y, [vertex_count]
HWI [sped3_index]

JSR rotate

:main_loop

; query clock
SET A, 1
HWI [clock_index]   ; get clock ticks since last call
SET Z, C
SUB Z, [last_rotate_time]
IFL Z, 5
SET PC, main_loop
SET [last_rotate_time], C
JSR rotate

SET PC, main_loop

:rotate
SET A, 2
ADD [last_rotate_value], 180
MOD [last_rotate_value], 360
SET X, [last_rotate_value]
HWI [sped3_index]
SET PC, POP

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
; end device discovery


:vertex_data
DAT 0xacac, 0x0554, 0xac54, 0x0554, 0xac54, 0x05ac, 0xacac, 0x05ac, 0xacac, 0x0554
DAT 0x5400, 0x0500, 0xac54, 0x0554, 0xac54, 0x05ac, 0x5400, 0x0500, 0xacac, 0x05ac

;DAT 0x7f81, 0x0100, 0x7f7f, 0x0200, 0x817f, 0x0300, 0x8181, 0x0000, 0x7f81, 0x0000
;DAT 0x0ff1, 0x05f0, 0x0f0f, 0x06f0, 0xf10f, 0x07f0, 0xf1f1, 0x04f0, 0x0ff1, 0x04f0

:vertex_count
DAT 10

:last_rotate_time
DAT 0

:last_rotate_value
DAT 0

; 35 bytes each
:known_devices
DAT 0xf615, 0x7349, "  X. LEM-1802 Monitor           ", 0
DAT 0x7406, 0x30cf, "  X. Generic Keyboard           ", 0
DAT 0xb402, 0x12d0, "  X. Generic Clock              ", 0
DAT 0x4cae, 0x74fa, "  X. HMD2043 Harold Media Drive ", 0
DAT 0xbf3c, 0x42ba, "  X. SPED3 Display              ", 0

:known_device_count
DAT 5

:sped3_index
DAT 0

:clock_index
DAT 0

:discovered_devices
DAT 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0 
