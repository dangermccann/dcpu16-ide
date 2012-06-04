; retrieve some entropy...
  SET C, 0xf000
  SET A, 32 * 1 + 2 + 0x8000 
  SET B, entropy_str1
  JSR print
  SET A,32 * 2 + 2 +  0x8000
  SET B, entropy_str2
  JSR print
  SET I, 0
:cyc4
  ADD I, 1
  JSR next_key
  IFE A, 0
    SET PC, cyc4
  MUL [rand_seed], 36313
  ADD [rand_seed], A
  MUL [rand_seed], 36313
  ADD [rand_seed], I
  
  SET A, 0x8000              ; clear screen
:cyc3
  SET [A], 0
  ADD A, 1
  IFG 32*12 + 0x8000, A
    SET PC, cyc3
; init
  SET A, 0x8000
  SET B, 0
:cyc1
  SET [A], 0x7700
  ADD A, 1
  ADD B, 1
  IFG 10, B
    SET PC, jmp1
  SET B, 0
  ADD A, 32 - 10
:jmp1
  IFG 32*12 + 0x8000, A
    SET PC, cyc1
  SET C, 0xf700
  SET A, 32 * 1 + 1 + 0x8000; (1, 1)
  SET B, score_str
  JSR print
  SET A, 32 * 3 + 1 + 0x8000 ; (1, 3)
  SET B, level_str
  JSR print
  SET A, 32 * 5 + 1 + 0x8000 ; (1, 5)
  SET B, next_str
  JSR print
  SET A, 0x8000
:cyc2
  SET [A + 10], 0x1100
  SET [A + 31], 0x1100
  ADD A, 32
  IFG 32*12 + 0x8000, A
    SET PC, cyc2
  JSR update_score
  JSR update_level
  JSR select_next_piece
SET PC, main_loop
;;;;;;;;;;;;;;;
; SUBROUTINES ;
;;;;;;;;;;;;;;;
:print                    ; takes coord at A, string to output at B, style at C
  IFE [B], 0
    SET PC, POP
  SET [A], [B]
  BOR [A], C
  ADD A, 1
  ADD B, 1
  SET PC, print
:next_rand                ; takes no arguments, returns random word in A
  MUL [rand_seed], 10061
  ADD [rand_seed], 1
  SET A, [rand_seed]
  SET PC, POP
:rand_seed
  DAT 0xC00F              ; TODO: collect entropy at start to randomize game
:next_key                 ; reads next key to A from keyboard (based on Notch's code)
  SET PUSH, C
  SET A, 1
  HWI 1
  SET A, C
  SET C, POP
  SET PC, POP
:keypointer
  DAT 0
:select_next_piece        ; selects next piece
  JSR next_rand
  MOD A, 7
  SET [cur_piece], [next_piece]
  SET [next_piece], A
  SET [piece_pos], 0x8000 + 17
  SET PC, POP
:cur_piece
  DAT 0
:cur_rot
  DAT 0
:next_piece
  DAT 0
:piece_pos
  DAT 0x8000 + 17
:update_score             ; display current score
  SET A, [score]
  SET C, 32*2 + 8 + 0x8000
:score_cyc1
  SET B, A
  MOD B, 10
  BOR B, 0xe730
  SET [C], B
  SUB C, 1
  DIV A, 10
  IFG A, 0
    SET PC, score_cyc1
  SET PC, POP
:update_level             ; display current level
  SET A, [level]
  SET C, 32*4 + 8 + 0x8000
:level_cyc1
  SET B, A
  MOD B, 10
  BOR B, 0xe730
  SET [C], B
  SUB C, 1
  DIV A, 10
  IFG A, 0
    SET PC, level_cyc1
  SET PC, POP
:show_cur_piece           ; display/clear/check current piece (A=0 - clear, A=1 - display, A=2 - check), if A=2 doesn't actually place anything, return B=1 is position is valid, 0 otherwise
  SET X, [piece_pos]      ; place block at [X] (display)
  SET Y, [cur_piece]      ; ...from [Y] (pieces array)
  SHL Y, 2
  BOR Y, [cur_rot]
  SHL Y, 4
  ADD Y, pieces
  SET I, 0                ; index
:piece_cyc1
  SET B, [Y]
  IFE B, 0
    SET PC, piece_jmp1
  IFG 2, A
    SET PC, piece_jmp2
    IFG X, 32*12 + 0x8000
      ADD PC, 3
    IFE [X], 0
      SET PC, piece_jmp1
    SET B, 0
    SET PC, POP
:piece_jmp2
  IFE A, 0
    SET B, 0
  SET [X], B
  SET [X + 1], B
:piece_jmp1
  ADD I, 1
  ADD X, 2
  ADD Y, 1
  SET B, 1
  IFE I, 16
    SET PC, POP
  IFB I, 3
    SET PC, piece_cyc1
  ADD X, 32 - 8
  SET PC, piece_cyc1   
:show_next_piece              ; redraw next piece
  SET X, 32*7 + 1 + 0x8000    ; place block at [X] (display)
  SET Y, [next_piece]         ; ...from [Y] (pieces array)
  SHL Y, 6
  ADD Y, pieces
  SET I, 0                    ; index
:npiece_cyc1
  SET B, [Y]
  IFE B, 0
    SET B, 0x7700
  SET [X], B
  SET [X + 1], B
:npiece_jmp1
  ADD I, 1
  ADD X, 2
  ADD Y, 1
  SET B, 1
  IFE I, 16
    SET PC, POP
  IFB I, 3
    SET PC, npiece_cyc1
  ADD X, 32 - 8
  SET PC, npiece_cyc1  
:scan_lines                   ; search for complete lines, remove them and move all other down; update score & level
  SET A, 32*11 + 11 + 0x8000  ; start of next line to fill
  SET B, A                    ; start of next line to check
  SET J, 0                    ; num of lines skipped
:scan_cyc2
  SET I, 0                    ; horizontal index
  SET X, B
:scan_cyc1
  IFE [X], 0
    SET PC, scan_jmp1
  ADD X, 2
  ADD I, 1
  IFG 10, I
    SET PC, scan_cyc1
  ADD J, 1                    ; no gaps found, increase num of complete rows
  SUB B, 32
  IFE J, 4
    SET PC, scan_jmp1
  IFG B, 0x8000
    SET PC, scan_cyc2
:scan_jmp1                    ; found a gap, or no more gaps can be found
  IFE A, B
    SET PC, scan_jmp2         ; no need to move anything, continue
  SET I, 0
:scan_cyc3
  SET [A], [B]
  ADD I, 1
  ADD A, 1
  ADD B, 1
  IFG 20, I
    SET PC, scan_cyc3
  SUB A, 20
  SUB B, 20
:scan_jmp2
  SUB A, 32
  IFG 0x8000, A
    SET PC, scan_end
  SUB B, 32
  IFE J, 4
    SET PC, scan_jmp1
  IFG 0x8000, B
    SET PC, scan_jmp1
  SET PC, scan_cyc2
:scan_end
  IFE J, 0
    SET PC, POP
  ADD [lines], J
  SET J, [lines_score + J]
  MUL J, [level]
  ADD [score], J
  JSR update_score
  IFG 10, [lines]
    SET PC, POP
  SET [lines], 0
  ADD [level], 1
  JSR update_level
  SET PC, POP
:main_loop
  JSR select_next_piece
  SET A, 2
  JSR show_cur_piece          ; check if we can drop next piece
  IFE B, 0
    SET PC, game_over
  JSR show_next_piece         ; redraw next piece
  SET A, [level]
  SET [cycle_num], [level_cycles + A]
:drop_loop
  SET Z, [cycle_num]
:wait_loop_redraw             ; "heavy" way, redraw current piece
  SET A, 1
  JSR show_cur_piece
:wait_loop                    ; "light" way, when no keys were pressed
  IFE Z, 0
    SET PC, drop_jmp
  SUB Z, 1
; read from keyboard
  JSR next_key
  IFE A, 0x82
    SET PC, key_left
  IFE A, 0x83
    SET PC, key_right
  IFE A, 0x80
    SET PC, key_up
  IFE A, 0x81
    SET PC, key_down
  SET PC, wait_loop
:key_left
  SET A, 0
  JSR show_cur_piece
  SUB [piece_pos], 2
  SET A, 2
  JSR show_cur_piece
  IFE B, 1
    SET PC, wait_loop_redraw
  ADD [piece_pos], 2
  SET PC, wait_loop_redraw
:key_right
  SET A, 0
  JSR show_cur_piece
  ADD [piece_pos], 2
  SET A, 2
  JSR show_cur_piece
  IFE B, 1
    SET PC, wait_loop_redraw
  SUB [piece_pos], 2
  SET PC, wait_loop_redraw
:key_down
  SET [cycle_num], 100
  SET Z, 100
  SET PC, wait_loop
:key_up
  SET A, 0
  JSR show_cur_piece
  ADD [cur_rot], 1
  AND [cur_rot], 3
  SET A, 2
  JSR show_cur_piece
  IFE B, 1
    SET PC, wait_loop_redraw
  SUB [cur_rot], 1
  AND [cur_rot], 3
  SET PC, wait_loop_redraw
  
:drop_jmp
; lower current piece
  SET A, 0
  JSR show_cur_piece
  ADD [piece_pos], 32
  SET A, 2
  JSR show_cur_piece
  IFE B, 1
    SET PC, drop_loop
  SUB [piece_pos], 32
  SET A, 1
  JSR show_cur_piece
  JSR scan_lines
  SET PC, main_loop
:game_over                    ; print blinking game over message
  SET C, 0xf480
  SET A, 32 * 4 + 9 + 0x8000 ; (9, 4)
  SET B, game_over_pad
  JSR print
  SET A, 32 * 5 + 9 + 0x8000 ; (9, 5)
  SET B, game_over_str
  JSR print
  SET A, 32 * 6 + 9 + 0x8000 ; (9, 6)
  SET B, game_over_pad
  JSR print
  SUB PC, 1
:cycle_num
  DAT 2500
:level_cycles
  DAT 2500, 2500, 2000, 1500, 1000, 800, 650, 500, 300, 200, 100, 75, 50, 30, 20, 10, 5, 3, 2, 1
:lines_score
  DAT 0, 2, 5, 15, 60
:lines
  DAT 0
:level
  DAT 1
:score
  DAT 0
:entropy_str1
  DAT "Press any key to", 0
:entropy_str2
  DAT " make game random:", 0
:score_str
  DAT "Score:", 0
:level_str
  DAT "Level:", 0
:next_str
  DAT "Next:", 0
:game_over_pad
  DAT "              ", 0
:game_over_str
  DAT "  Game Over!  ", 0
:pieces
; I
  DAT 0, 0xcc00, 0, 0,   0, 0xcc00, 0, 0,   0, 0xcc00, 0, 0,   0, 0xcc00, 0, 0
  DAT 0, 0, 0, 0,   0xcc00, 0xcc00, 0xcc00, 0xcc00,   0, 0, 0, 0,   0, 0, 0, 0
  DAT 0, 0xcc00, 0, 0,   0, 0x0c00, 0, 0,   0, 0xcc00, 0, 0,   0, 0xcc00, 0, 0
  DAT 0, 0, 0, 0,   0xcc00, 0xcc00, 0xcc00, 0xcc00,   0, 0, 0, 0,   0, 0, 0, 0
; J
  DAT 0xdd00, 0, 0, 0,   0xdd00, 0xdd00, 0xdd00, 0,   0, 0, 0, 0,   0, 0, 0, 0
  DAT 0, 0xdd00, 0xdd00, 0,   0, 0xdd00, 0, 0,   0, 0xdd00, 0, 0,   0, 0, 0, 0
  DAT 0, 0, 0, 0,   0xdd00, 0xdd00, 0xdd00, 0,   0, 0, 0xdd00, 0,   0, 0, 0, 0
  DAT 0, 0xdd00, 0, 0,   0, 0xdd00, 0, 0,   0xdd00, 0xdd00, 0, 0,   0, 0, 0, 0
; L
  DAT 0, 0, 0xee00, 0,   0xee00, 0xee00, 0xee00, 0,   0, 0, 0, 0,   0, 0, 0, 0
  DAT 0, 0xee00, 0, 0,   0, 0xee00, 0, 0,   0, 0xee00, 0xee00, 0,   0, 0, 0, 0
  DAT 0, 0, 0, 0,   0xee00, 0xee00, 0xee00, 0,   0xee00, 0, 0, 0,   0, 0, 0, 0
  DAT 0xee00, 0xee00, 0, 0,   0, 0xee00, 0, 0,   0, 0xee00, 0, 0,   0, 0, 0, 0
; O
  DAT 0xbb00, 0xbb00, 0, 0,   0xbb00, 0xbb00, 0, 0,   0, 0, 0, 0,   0, 0, 0, 0
  DAT 0xbb00, 0xbb00, 0, 0,   0xbb00, 0xbb00, 0, 0,   0, 0, 0, 0,   0, 0, 0, 0
  DAT 0xbb00, 0xbb00, 0, 0,   0xbb00, 0xbb00, 0, 0,   0, 0, 0, 0,   0, 0, 0, 0
  DAT 0xbb00, 0xbb00, 0, 0,   0xbb00, 0xbb00, 0, 0,   0, 0, 0, 0,   0, 0, 0, 0
; S
  DAT 0, 0x9900, 0x9900, 0,   0x9900, 0x9900, 0, 0,   0, 0, 0, 0,   0, 0, 0, 0
  DAT 0, 0x9900, 0, 0,   0, 0x9900, 0x9900, 0,   0, 0, 0x9900, 0,   0, 0, 0, 0
  DAT 0, 0x9900, 0x9900, 0,   0x9900, 0x9900, 0, 0,   0, 0, 0, 0,   0, 0, 0, 0
  DAT 0, 0x9900, 0, 0,   0, 0x9900, 0x9900, 0,   0, 0, 0x9900, 0,   0, 0, 0, 0
; T  
  DAT 0x8800, 0x8800, 0x8800, 0,   0, 0x8800, 0, 0,   0, 0, 0, 0,   0, 0, 0, 0
  DAT 0, 0x8800, 0, 0,   0x8800, 0x8800, 0, 0,   0, 0x8800, 0, 0,   0, 0, 0, 0
  DAT 0, 0x8800, 0, 0,   0x8800, 0x8800, 0x8800, 0,   0, 0, 0, 0,   0, 0, 0, 0
  DAT 0, 0x8800, 0, 0,   0, 0x8800, 0x8800, 0,   0, 0x8800, 0, 0,   0, 0, 0, 0
; Z
  DAT 0xaa00, 0xaa00, 0, 0,   0, 0xaa00, 0xaa00, 0,   0, 0, 0, 0,   0, 0, 0, 0
  DAT 0, 0, 0xaa00, 0,   0, 0xaa00, 0xaa00, 0,   0, 0xaa00, 0, 0,   0, 0, 0, 0
  DAT 0xaa00, 0xaa00, 0, 0,   0, 0xaa00, 0xaa00, 0,   0, 0, 0, 0,   0, 0, 0, 0
  DAT 0, 0, 0xaa00, 0,   0, 0xaa00, 0xaa00, 0,   0, 0xaa00, 0, 0,   0, 0, 0, 0