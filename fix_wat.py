import re

with open('noise-generator.wat', 'r') as f:
    wat = f.read()

# Fix $fillRed name
wat = wat.replace('(func (export "fillRed")', '(func $fillRed (export "fillRed")')

# Fix double parentheses in param
wat = wat.replace('(param $g5 f32))', '(param $g5 f32)')

# Fix fillRain if
wat = wat.replace('if (call $random f32.const 0.4 f32.mul local.set $impulse) end',
'''if
        call $random f32.const 0.4 f32.mul local.set $impulse
      end''')

# Fix fillForest f32.rem
wat = wat.replace('f32.const 0.00005 f32.add f32.const 6.28318530718 f32.rem local.set $lfoPhase',
'''f32.const 0.00005 f32.add local.set $lfoPhase
      local.get $lfoPhase f32.const 6.28318530718 f32.gt
      if
        local.get $lfoPhase f32.const 6.28318530718 f32.sub local.set $lfoPhase
      end''')

# Rewrite fillChimes completely
fillChimes_replacement = """  (func (export "fillChimes") (param $ptr i32) (param $len i32) (param $chimeBaseFreq f32) (param $phaseConst f32)
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
  )"""

import re
wat = re.sub(r'  \(func \(export "fillChimes"\).*?\(func \(export "fillBrown"\)', fillChimes_replacement + '\n\n  (func (export "fillBrown")', wat, flags=re.DOTALL)

with open('noise-generator.wat', 'w') as f:
    f.write(wat)
print("WAT patched successfully.")
