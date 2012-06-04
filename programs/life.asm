; X             : width
; Y             : height
; C             : current cell mask (01b or 10b)
; 0x1000 ...    : cell states
            ; Set width/height
            set X, 0x10 ; width
            set Y, 0x08 ; height
            set C, 0x1 ; 01b
            ; Setup a glider in the top left corner
            set A, 0x01
            set B, 0x00
            jsr toggle
            set A, 0x02
            set B, 0x01
            jsr toggle
            set A, 0x00
            set B, 0x02
            jsr toggle
            set A, 0x01
            set B, 0x02
            jsr toggle
            set A, 0x02
            set B, 0x02
            jsr toggle
:mainloop   jsr output
            jsr tick
            set PC, mainloop
; Toggles the given cell. NOTE: only safe before starting
:toggle ;(x, y)
            mul B, X
            add A, B
            add A, 0x1000   ; A : correct cell offset
            xor [A], 0x1    ; toggle it!
            set PC, POP
; Uses the observation that the GoL rules can be summarized as `(t | n) == 3`,
; where `t` is the state of the current cell (1 or 0) and `n` is the sum of the
; states of the neighbours (i.e. the number of living neighbours).
;   In each cell memory slot, two statse are stored (in bit 0 and bit 1); the
; `C` register keeps track of a bitmask of which state is the "current" one.
; Advance a generation (in-memory)
:tick
            set I, Y        ; let I be loop counter
            mul I, X
:loop       ife I, 0        ; loop until I=0
                set PC, loopend
            add I, 0xfff    ; (Temporarily)
            set A, [1+I]    ; set A to value at cell (t)
            and A, C
            ; Set B to (sum of neighbours << (C - 1))
            set B, [I]
            and B, C
            set J, [2+I]
            and J, C
            add B, J
            sub I, X
            set J, [I]
            and J, C
            add B, J
            set J, [1+I]
            and J, C
            add B, J
            set J, [2+I]
            and J, C
            add B, J
            add I, X
            add I, X
            set J, [I]
            and J, C
            add B, J
            set J, [1+I]
            and J, C
            add B, J
            set J, [2+I]
            and J, C
            add B, J
            ; Prepare stuff
            sub C, 1
            shr B, C
            shr A, C
            ; Set B to (t | n)
            bor B, A
            ; Set the new state
            ifn B, 3
                set B, 0
            and B, 0x2   ; B to {00b, 10b} >> (c-1)
            shr B, C
            add C, 1
            sub I, X
            and [1+I], C
            xor [1+I], B
            sub I, 0x1000     ; Restore I again, also decrement by 1
            ; Next iteration
            set PC, loop
:loopend    ; clean up & return
            xor C, 0x3
            set PC, POP
; Output current state to display
:output
            set I, Y        ; let I be loop counter
            mul I, X
:loop2      ife I, 0        ; loop until I=0
                set PC, loop2end
            sub I, 1
            set A, [0x1000+I] ; set A to value at cell (t)
            and A, C
            sub C, 1
            shr A, C
            add C, 1
            mul A, 3
            add A, 0xf120
            set Z, I          ; prepare output position
            set J, I
            div Z, X
            mod J, X
            mul Z, 0x20       ; 0x20 = display width
            add J, Z
            add J, 0x8000
            set [J], A
            ; Next iteration
            set PC, loop2
:loop2end   ; clean up & return
            set PC, POP
