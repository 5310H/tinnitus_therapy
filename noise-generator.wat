(module
  (import "Math" "sin" (func $f32_sin (param f32) (result f32))) ;; Import Math.sin
  (memory (export "memory") 1)
  ;; PRNG State (Xorshift32)
  (global $seed (mut i32) (i32.const 123456789))

  ;; Generates a pseudo-random f32 in range [-1.0, 1.0]
  (func $random (result f32)
    (local $x i32)
    global.get $seed
    local.set $x
    
    local.get $x
    i32.const 13
    i32.shl
    local.get $x
    i32.xor
    local.set $x
    
    local.get $x
    i32.const 17
    i32.shr_u
    local.get $x
    i32.xor
    local.set $x
    
    local.get $x
    i32.const 5
    i32.shl
    local.get $x
    i32.xor
    local.tee $x
    global.set $seed
    
    ;; Map i32 to f32 [-1, 1]
    local.get $x
    f32.convert_i32_s
    f32.const 2147483647.0
    f32.div
  )

  ;; Fills a buffer with White Noise
  (func (export "fillWhite") (param $ptr i32) (param $len i32)
    (local $i i32)
    (local.set $i (i32.const 0))
    (loop $loop
      local.get $ptr
      local.get $i
      i32.const 4
      i32.mul
      i32.add
      call $random
      f32.store

      local.get $i
      i32.const 1
      i32.add
      local.tee $i
      local.get $len
      i32.lt_u
      br_if $loop
    )
  )

  ;; Red Noise state stored in Memory[0] (lastOut) and Memory[88] (lastOut2)
  (func $fillRed (export "fillRed") (param $ptr i32) (param $len i32)
    (local $i i32) (local $w f32) (local $l1 f32) (local $l2 f32)
    (local $lastIn f32) (local $hpState f32) (local $raw f32) (local $out f32)
    (local.set $l1 (f32.load (i32.const 0)))
    (local.set $l2 (f32.load (i32.const 88)))
    (local.set $lastIn (f32.load (i32.const 32)))
    (local.set $hpState (f32.load (i32.const 36)))
    (local.set $i (i32.const 0))
    (loop $loop
      call $random
      local.set $w
      local.get $l1 f32.const 0.999 f32.mul local.get $w f32.const 0.01 f32.mul f32.add local.set $l1
      local.get $l2 f32.const 0.999 f32.mul local.get $l1 f32.const 0.01 f32.mul f32.add local.set $l2
      local.get $l2 f32.const 45.0 f32.mul local.set $raw
      local.get $raw local.get $lastIn f32.sub f32.const 0.997 local.get $hpState f32.mul f32.add local.set $out
      local.get $raw local.set $lastIn
      local.get $out local.set $hpState
      local.get $ptr local.get $i i32.const 4 i32.mul i32.add local.get $out f32.store
      local.get $i i32.const 1 i32.add local.tee $i local.get $len i32.lt_u br_if $loop
    )
    (f32.store (i32.const 0) (local.get $l1)) (f32.store (i32.const 88) (local.get $l2))
    (f32.store (i32.const 32) (local.get $lastIn)) (f32.store (i32.const 36) (local.get $hpState))
  )

  ;; Ocean Noise: Red noise logic with a sinusoidal surge multiplier
  (func (export "fillOcean") (param $ptr i32) (param $len i32) (param $surge f32)
    (local $i i32)
    (call $fillRed (local.get $ptr) (local.get $len))
    (local.set $i (i32.const 0))
    (loop $loop
      local.get $ptr local.get $i i32.const 4 i32.mul i32.add
      local.get $ptr local.get $i i32.const 4 i32.mul i32.add f32.load
      local.get $surge f32.mul
      f32.store
      local.get $i i32.const 1 i32.add local.tee $i local.get $len i32.lt_u br_if $loop
    )
  )

  ;; Rain Noise: Pink noise core + organic patter impulses
  (func (export "fillRain") (param $ptr i32) (param $len i32) 
        (param $p0 f32) (param $p1 f32) (param $p2 f32) (param $p3 f32) (param $p4 f32) (param $p5 f32)
        (param $g0 f32) (param $g1 f32) (param $g2 f32) (param $g3 f32) (param $g4 f32) (param $g5 f32)
    (local $i i32) (local $w f32) (local $rawPink f32) (local $impulse f32) (local $patter f32)
    (local $b0 f32) (local $b1 f32) (local $b2 f32) (local $b3 f32) (local $b4 f32) (local $b5 f32) (local $b6 f32)
    (local $lastIn f32) (local $hpState f32) (local $mixed f32) (local $out f32)

    (local.set $b0 (f32.load (i32.const 4))) (local.set $b1 (f32.load (i32.const 8)))
    (local.set $b2 (f32.load (i32.const 12))) (local.set $b3 (f32.load (i32.const 16)))
    (local.set $b4 (f32.load (i32.const 20))) (local.set $b5 (f32.load (i32.const 24)))
    (local.set $b6 (f32.load (i32.const 28))) (local.set $lastIn (f32.load (i32.const 32)))
    (local.set $hpState (f32.load (i32.const 36)))
    (local.set $patter (f32.load (i32.const 92)))

    (local.set $i (i32.const 0))
    (loop $loop
      call $random local.set $w
      local.get $p0 local.get $b0 f32.mul local.get $w local.get $g0 f32.mul f32.add local.set $b0
      local.get $p1 local.get $b1 f32.mul local.get $w local.get $g1 f32.mul f32.add local.set $b1
      local.get $p2 local.get $b2 f32.mul local.get $w local.get $g2 f32.mul f32.add local.set $b2
      local.get $p3 local.get $b3 f32.mul local.get $w local.get $g3 f32.mul f32.add local.set $b3
      local.get $p4 local.get $b4 f32.mul local.get $w local.get $g4 f32.mul f32.add local.set $b4
      local.get $p5 local.get $b5 f32.mul local.get $w local.get $g5 f32.mul f32.add local.set $b5

      local.get $b0 local.get $b1 f32.add local.get $b2 f32.add local.get $b3 f32.add 
      local.get $b4 f32.add local.get $b5 f32.add local.get $b6 f32.add
      local.get $w f32.const 0.5362 f32.mul f32.add f32.const 0.85 f32.mul local.set $rawPink

      ;; Organic Impulse
      f32.const 0.0 local.set $impulse
      call $random f32.const 1.0 f32.add f32.const 2.0 f32.div f32.const 0.9997 f32.gt
      if
        call $random f32.const 0.4 f32.mul local.set $impulse
      end
      local.get $patter f32.const 0.995 f32.mul local.get $impulse f32.add local.set $patter

      local.get $rawPink f32.const 0.85 f32.mul local.get $patter f32.const 0.15 f32.mul f32.add local.set $mixed
      local.get $mixed local.get $lastIn f32.sub f32.const 0.997 local.get $hpState f32.mul f32.add local.set $out
      local.get $mixed local.set $lastIn
      local.get $out local.set $hpState
      local.get $ptr local.get $i i32.const 4 i32.mul i32.add local.get $out f32.store
      local.get $w f32.const 0.115926 f32.mul local.set $b6
      local.get $i i32.const 1 i32.add local.tee $i local.get $len i32.lt_u br_if $loop
    )
    (f32.store (i32.const 4) (local.get $b0)) (f32.store (i32.const 8) (local.get $b1))
    (f32.store (i32.const 12) (local.get $b2)) (f32.store (i32.const 16) (local.get $b3))
    (f32.store (i32.const 20) (local.get $b4)) (f32.store (i32.const 24) (local.get $b5))
    (f32.store (i32.const 28) (local.get $b6)) (f32.store (i32.const 32) (local.get $lastIn))
    (f32.store (i32.const 36) (local.get $hpState)) (f32.store (i32.const 92) (local.get $patter))
  )

  ;; Blue Noise state stored in Memory[96..108]
  (func (export "fillBlue") (param $ptr i32) (param $len i32)
    (local $i i32) (local $w f32) (local $c0 f32) (local $c1 f32) (local $c2 f32) (local $blue f32)
    (local.set $c0 (f32.load (i32.const 96)))
    (local.set $c1 (f32.load (i32.const 100)))
    (local.set $c2 (f32.load (i32.const 104)))
    (local.set $i (i32.const 0))
    (loop $loop
      call $random
      local.set $w
      local.get $c0 f32.const 0.8 f32.mul local.get $w f32.const 0.2 f32.mul f32.add local.set $c0
      local.get $c1 f32.const 0.92 f32.mul local.get $w f32.const 0.15 f32.mul f32.add local.set $c1
      local.get $c2 f32.const 0.99 f32.mul local.get $w f32.const 0.05 f32.mul f32.add local.set $c2
      
      local.get $w
      local.get $c0 local.get $c1 f32.add local.get $c2 f32.add
      f32.const 0.2 f32.mul
      f32.sub
      f32.const 1.5 f32.mul
      local.set $blue

      local.get $ptr local.get $i i32.const 4 i32.mul i32.add local.get $blue f32.store
      local.get $i i32.const 1 i32.add local.tee $i local.get $len i32.lt_u br_if $loop
    )
    (f32.store (i32.const 96) (local.get $c0))
    (f32.store (i32.const 100) (local.get $c1))
    (f32.store (i32.const 104) (local.get $c2))
  )

  ;; Violet Noise state stored in Memory[108]
  (func (export "fillViolet") (param $ptr i32) (param $len i32)
    (local $i i32) (local $w f32) (local $lastIn f32) (local $val f32)
    (local.set $lastIn (f32.load (i32.const 108)))
    (local.set $i (i32.const 0))
    (loop $loop
      call $random
      local.set $w
      local.get $w local.get $lastIn f32.sub f32.const 0.8 f32.mul local.set $val
      local.get $w local.set $lastIn
      local.get $ptr local.get $i i32.const 4 i32.mul i32.add local.get $val f32.store
      local.get $i i32.const 1 i32.add local.tee $i local.get $len i32.lt_u br_if $loop
    )
    (f32.store (i32.const 108) (local.get $lastIn))
  )

  ;; Forest Noise state stored in Memory[112] (lfoPhase) and Memory[116] (lfoVal)
  (func (export "fillForest") (param $ptr i32) (param $len i32)
    (local $i i32) (local $w f32) (local $lfoPhase f32) (local $lfoVal f32) (local $out f32)
    (local.set $lfoPhase (f32.load (i32.const 112)))
    (local.set $lfoVal (f32.load (i32.const 116)))
    (local.set $i (i32.const 0))
    (loop $loop
      call $random local.set $w ;; White noise base

      ;; Update LFO: lfoPhase = (lfoPhase + 0.00005) % (2 * PI)
      local.get $lfoPhase f32.const 0.00005 f32.add local.set $lfoPhase
      local.get $lfoPhase f32.const 6.28318530718 f32.gt
      if
        local.get $lfoPhase f32.const 6.28318530718 f32.sub local.set $lfoPhase
      end
      ;; lfoVal = (Math.sin(lfoPhase) * 0.5 + 0.5) * 0.5 + 0.5 (range 0.5 to 1.0)
      local.get $lfoPhase call $f32_sin f32.const 0.5 f32.mul f32.const 0.5 f32.add f32.const 0.5 f32.mul f32.const 0.5 f32.add local.set $lfoVal

      ;; out = w * lfoVal
      local.get $w local.get $lfoVal f32.mul local.set $out

      local.get $ptr local.get $i i32.const 4 i32.mul i32.add local.get $out f32.store
      local.get $i i32.const 1 i32.add local.tee $i local.get $len i32.lt_u br_if $loop
    )
    (f32.store (i32.const 112) (local.get $lfoPhase))
    (f32.store (i32.const 116) (local.get $lfoVal))
  )

  ;; Pink Noise state stored in Memory[4..40]
  (func (export "fillPink") (param $ptr i32) (param $len i32) 
        (param $p0 f32) (param $p1 f32) (param $p2 f32) (param $p3 f32) (param $p4 f32) (param $p5 f32)
        (param $g0 f32) (param $g1 f32) (param $g2 f32) (param $g3 f32) (param $g4 f32) (param $g5 f32)
    (local $i i32)
    (local $w f32)
    (local $b0 f32) (local $b1 f32) (local $b2 f32) (local $b3 f32) (local $b4 f32) (local $b5 f32) (local $b6 f32)
    (local $lastIn f32) (local $hpState f32)
    (local $raw f32) (local $out f32)

    ;; Load states from memory
    (local.set $b0 (f32.load (i32.const 4)))
    (local.set $b1 (f32.load (i32.const 8)))
    (local.set $b2 (f32.load (i32.const 12)))
    (local.set $b3 (f32.load (i32.const 16)))
    (local.set $b4 (f32.load (i32.const 20)))
    (local.set $b5 (f32.load (i32.const 24)))
    (local.set $b6 (f32.load (i32.const 28)))
    (local.set $lastIn (f32.load (i32.const 32)))
    (local.set $hpState (f32.load (i32.const 36)))

    (local.set $i (i32.const 0))
    (loop $loop
      call $random
      local.set $w

      ;; Update 6 poles
      local.get $p0 local.get $b0 f32.mul local.get $w local.get $g0 f32.mul f32.add local.set $b0
      local.get $p1 local.get $b1 f32.mul local.get $w local.get $g1 f32.mul f32.add local.set $b1
      local.get $p2 local.get $b2 f32.mul local.get $w local.get $g2 f32.mul f32.add local.set $b2
      local.get $p3 local.get $b3 f32.mul local.get $w local.get $g3 f32.mul f32.add local.set $b3
      local.get $p4 local.get $b4 f32.mul local.get $w local.get $g4 f32.mul f32.add local.set $b4
      local.get $p5 local.get $b5 f32.mul local.get $w local.get $g5 f32.mul f32.add local.set $b5

      ;; raw = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + w * 0.5362) * 0.85
      local.get $b0 local.get $b1 f32.add local.get $b2 f32.add local.get $b3 f32.add 
      local.get $b4 f32.add local.get $b5 f32.add local.get $b6 f32.add
      local.get $w f32.const 0.5362 f32.mul f32.add
      f32.const 0.85 f32.mul
      local.set $raw

      ;; High-pass filter (DC blocker): out = raw - lastIn + (0.997 * hpState)
      local.get $raw local.get $lastIn f32.sub f32.const 0.997 local.get $hpState f32.mul f32.add
      local.set $out

      ;; Update HPF state
      local.get $raw local.set $lastIn
      local.get $out local.set $hpState

      ;; Store sample
      local.get $ptr local.get $i i32.const 4 i32.mul i32.add local.get $out f32.store

      ;; Update b6 for next iteration
      local.get $w f32.const 0.115926 f32.mul local.set $b6

      local.get $i i32.const 1 i32.add local.tee $i local.get $len i32.lt_u br_if $loop
    )

    ;; Save states back to memory
    (f32.store (i32.const 4) (local.get $b0))
    (f32.store (i32.const 8) (local.get $b1))
    (f32.store (i32.const 12) (local.get $b2))
    (f32.store (i32.const 16) (local.get $b3))
    (f32.store (i32.const 20) (local.get $b4))
    (f32.store (i32.const 24) (local.get $b5))
    (f32.store (i32.const 28) (local.get $b6))
    (f32.store (i32.const 32) (local.get $lastIn))
    (f32.store (i32.const 36) (local.get $hpState))
  )

  ;; Chimes state stored in Memory[40..104]
  ;; phases: Memory[40] to Memory[64] (6 f32)
  ;; envelopes: Memory[64] to Memory[88] (6 f32)
  (func (export "fillChimes") (param $ptr i32) (param $len i32) (param $chimeBaseFreq f32) (param $phaseConst f32)
    (local $i i32)
    (local $h i32)
    (local $val f32)
    (local $rand_prob f32)
    (local $env_val f32)
    (local $phase_val f32)
    (local $current_ratio f32)
    (local $new_phase f32)

    ;; Hardcoded ratios for 6 harmonics
    (local $ratios_0 f32) (local $ratios_1 f32) (local $ratios_2 f32)
    (local $ratios_3 f32) (local $ratios_4 f32) (local $ratios_5 f32)
    (local.set $ratios_0 (f32.const 1.0))
    (local.set $ratios_1 (f32.const 1.25))
    (local.set $ratios_2 (f32.const 1.5))
    (local.set $ratios_3 (f32.const 1.875))
    (local.set $ratios_4 (f32.const 2.0))
    (local.set $ratios_5 (f32.const 2.5))

    (local.set $i (i32.const 0))
    (loop $loop_i
      (local.set $val (f32.const 0.0))
      
      ;; Check for new strikes for each harmonic
      (local.set $h (i32.const 0))
      (loop $loop_h_strike
        call $random
        f32.const 1.0
        f32.add
        f32.const 2.0
        f32.div ;; Map [-1, 1] to [0, 1]
        local.set $rand_prob

        local.get $rand_prob
        f32.const 0.0015
        f32.lt
        if
          local.get $h
          i32.const 4
          i32.mul
          i32.const 64 ;; envelopes start at 64
          i32.add

          f32.const 0.7
          call $random
          f32.const 1.0
          f32.add
          f32.const 2.0
          f32.div ;; Map [-1, 1] to [0, 1]
          f32.const 0.3
          f32.mul
          f32.add ;; 0.7 + random * 0.3
          local.tee $env_val
          
          f32.store
        end

        local.get $h
        i32.const 4
        i32.mul
        i32.const 40 ;; phases start at 40
        i32.add
        f32.load
        local.set $phase_val

        local.get $h
        i32.const 4
        i32.mul
        i32.const 64 ;; envelopes start at 64
        i32.add
        f32.load
        local.set $env_val

        ;; Get ratio for current harmonic
        local.get $h
        i32.const 0
        i32.eq
        if local.get $ratios_0 local.set $current_ratio end
        local.get $h
        i32.const 1
        i32.eq
        if local.get $ratios_1 local.set $current_ratio end
        local.get $h
        i32.const 2
        i32.eq
        if local.get $ratios_2 local.set $current_ratio end
        local.get $h
        i32.const 3
        i32.eq
        if local.get $ratios_3 local.set $current_ratio end
        local.get $h
        i32.const 4
        i32.eq
        if local.get $ratios_4 local.set $current_ratio end
        local.get $h
        i32.const 5
        i32.eq
        if local.get $ratios_5 local.set $current_ratio end

        ;; val += Math.sin(phase) * envelope * (1.0 / (h + 1.0))
        local.get $phase_val
        call $f32_sin
        local.get $env_val
        f32.mul
        f32.const 1.0
        local.get $h
        f32.convert_i32_s
        f32.const 1.0
        f32.add
        f32.div
        f32.mul
        local.get $val
        f32.add
        local.set $val

        ;; Update phase: phase = (phase + phaseConst * chimeBaseFreq * ratio) % (2 * PI)
        local.get $phase_val
        local.get $phaseConst
        local.get $chimeBaseFreq
        f32.mul
        local.get $current_ratio
        f32.mul
        f32.add
        local.set $new_phase

        local.get $new_phase
        f32.const 6.28318530718 ;; 2 * PI
        f32.gt
        if
          local.get $new_phase
          f32.const 6.28318530718
          f32.sub
          local.set $new_phase
        end

        local.get $h
        i32.const 4
        i32.mul
        i32.const 40
        i32.add
        local.get $new_phase
        f32.store

        ;; Update envelope: envelope *= 0.99996
        local.get $h
        i32.const 4
        i32.mul
        i32.const 64
        i32.add
        local.get $env_val
        f32.const 0.99996
        f32.mul
        f32.store

        local.get $h
        i32.const 1
        i32.add
        local.tee $h
        i32.const 6 ;; 6 harmonics
        i32.lt_u
        br_if $loop_h_strike
      )

      ;; Store sample
      local.get $ptr
      local.get $i
      i32.const 4
      i32.mul
      i32.add
      local.get $val
      f32.const 0.4 ;; val * 0.4
      f32.mul
      f32.store

      local.get $i
      i32.const 1
      i32.add
      local.tee $i
      local.get $len
      i32.lt_u
      br_if $loop_i
    )
  )

  (func (export "fillBrown") (param $ptr i32) (param $len i32) (param $pole f32) (param $gain f32)
    (local $i i32) (local $last f32) (local $lastIn f32) (local $hpState f32) (local $out f32)
    (local.set $last (f32.load (i32.const 0)))
    (local.set $lastIn (f32.load (i32.const 32)))
    (local.set $hpState (f32.load (i32.const 36)))

    (loop $loop
      call $random
      local.get $gain f32.mul
      local.get $last local.get $pole f32.mul
      f32.add
      local.tee $last
      
      ;; High-pass filter (DC blocker): out = last - lastIn + (0.997 * hpState)
      local.get $lastIn f32.sub 
      f32.const 0.997 local.get $hpState f32.mul 
      f32.add
      local.set $out

      ;; Update HPF states
      local.get $last local.set $lastIn
      local.get $out local.set $hpState

      ;; Store to output buffer
      local.get $ptr
      local.get $i
      i32.const 4
      i32.mul
      i32.add
      local.get $out
      f32.store

      local.get $i
      i32.const 1
      i32.add
      local.tee $i
      local.get $len
      i32.lt_u
      br_if $loop
    )
    ;; Save state for next block
    (f32.store (i32.const 0) (local.get $last))
    (f32.store (i32.const 32) (local.get $lastIn))
    (f32.store (i32.const 36) (local.get $hpState))
  )
)