(module
  ;; ==================================================================
  ;;  Minecraft XP-seed cracking kernel  (generated - see gen.js)
  ;;  Faithful port of java.util.Random and vanilla getEnchantmentCost.
  ;; ==================================================================
  (memory (export "memory") 4 8192)

  ;; ---- scan(start, count, obsPtr, nObs, outPtr, maxOut) -> survivors (-1 = overflow)
  (func $scan (param $start i32) (param $count i32) (param $obsPtr i32) (param $nObs i32)
              (param $outPtr i32) (param $maxOut i32) (result i32)
    (local $seed i64) (local $r i32) (local $u i32) (local $m i32) (local $bnd i32)
    (local $t i32) (local $base i32) (local $b i32) (local $v i32) (local $ok i32)
    (local $p i32) (local $i i32) (local $s i32) (local $n i32) (local $k i32)
    (local.set $s (local.get $start))
    (local.set $n (i32.const 0))
    (local.set $k (i32.const 0))
    (block $end (loop $L
      (br_if $end (i32.ge_u (local.get $k) (local.get $count)))
      
    (local.set $ok (i32.const 1))
    (local.set $p (local.get $obsPtr))
    (local.set $i (i32.const 0))
    (block $obsEnd0 (loop $obsLoop0
      (br_if $obsEnd0 (i32.ge_u (local.get $i) (local.get $nObs)))
      (local.set $b  (i32.load          (local.get $p)))
      (local.set $seed (i64.and (i64.xor (i64.extend_i32_s (local.get $s)) (i64.const 0x5DEECE66D)) (i64.const 0xFFFFFFFFFFFF)))
      ;; ---- slot 0: max(base/3,1), never hidden
      
    
    (local.set $seed (i64.and (i64.add (i64.mul (local.get $seed) (i64.const 0x5DEECE66D)) (i64.const 11)) (i64.const 0xFFFFFFFFFFFF)))
    (local.set $r (i32.wrap_i64 (i64.shr_u (local.get $seed) (i64.const 17))))
    (local.set $base (i32.add (i32.add (i32.shr_u (local.get $r) (i32.const 28)) (i32.const 1)) (i32.shr_u (local.get $b) (i32.const 1))))
    (local.set $bnd (i32.add (local.get $b) (i32.const 1)))
    
    (local.set $m (i32.sub (local.get $bnd) (i32.const 1)))
    (if (i32.eqz (i32.and (local.get $bnd) (local.get $m)))
      (then 
    (local.set $seed (i64.and (i64.add (i64.mul (local.get $seed) (i64.const 0x5DEECE66D)) (i64.const 11)) (i64.const 0xFFFFFFFFFFFF)))
    (local.set $r (i32.wrap_i64 (i64.shr_u (local.get $seed) (i64.const 17))))
        (local.set $t (i32.wrap_i64 (i64.shr_s (i64.mul (i64.extend_i32_s (local.get $bnd)) (i64.extend_i32_s (local.get $r))) (i64.const 31)))))
      (else 
    (local.set $seed (i64.and (i64.add (i64.mul (local.get $seed) (i64.const 0x5DEECE66D)) (i64.const 11)) (i64.const 0xFFFFFFFFFFFF)))
    (local.set $u (i32.wrap_i64 (i64.shr_u (local.get $seed) (i64.const 17))))
        (local.set $t (i32.rem_s (local.get $u) (local.get $bnd)))
        (block $d1 (loop $p1
          (br_if $d1 (i32.ge_s (i32.add (i32.sub (local.get $u) (local.get $t)) (local.get $m)) (i32.const 0)))
          
    (local.set $seed (i64.and (i64.add (i64.mul (local.get $seed) (i64.const 0x5DEECE66D)) (i64.const 11)) (i64.const 0xFFFFFFFFFFFF)))
    (local.set $u (i32.wrap_i64 (i64.shr_u (local.get $seed) (i64.const 17))))
          (local.set $t (i32.rem_s (local.get $u) (local.get $bnd)))
          (br $p1)))))
    (local.set $base (i32.add (local.get $base) (local.get $t)))
      (local.set $v (i32.div_s (local.get $base) (i32.const 3)))
      (if (i32.lt_s (local.get $v) (i32.const 1)) (then (local.set $v (i32.const 1))))
      (if (i32.ne (local.get $v) (i32.load offset=4 (local.get $p)))
        (then (local.set $ok (i32.const 0)) (br $obsEnd0)))
      ;; ---- slot 1: base*2/3+1, hidden if < 2
      
    
    (local.set $seed (i64.and (i64.add (i64.mul (local.get $seed) (i64.const 0x5DEECE66D)) (i64.const 11)) (i64.const 0xFFFFFFFFFFFF)))
    (local.set $r (i32.wrap_i64 (i64.shr_u (local.get $seed) (i64.const 17))))
    (local.set $base (i32.add (i32.add (i32.shr_u (local.get $r) (i32.const 28)) (i32.const 1)) (i32.shr_u (local.get $b) (i32.const 1))))
    (local.set $bnd (i32.add (local.get $b) (i32.const 1)))
    
    (local.set $m (i32.sub (local.get $bnd) (i32.const 1)))
    (if (i32.eqz (i32.and (local.get $bnd) (local.get $m)))
      (then 
    (local.set $seed (i64.and (i64.add (i64.mul (local.get $seed) (i64.const 0x5DEECE66D)) (i64.const 11)) (i64.const 0xFFFFFFFFFFFF)))
    (local.set $r (i32.wrap_i64 (i64.shr_u (local.get $seed) (i64.const 17))))
        (local.set $t (i32.wrap_i64 (i64.shr_s (i64.mul (i64.extend_i32_s (local.get $bnd)) (i64.extend_i32_s (local.get $r))) (i64.const 31)))))
      (else 
    (local.set $seed (i64.and (i64.add (i64.mul (local.get $seed) (i64.const 0x5DEECE66D)) (i64.const 11)) (i64.const 0xFFFFFFFFFFFF)))
    (local.set $u (i32.wrap_i64 (i64.shr_u (local.get $seed) (i64.const 17))))
        (local.set $t (i32.rem_s (local.get $u) (local.get $bnd)))
        (block $d2 (loop $p2
          (br_if $d2 (i32.ge_s (i32.add (i32.sub (local.get $u) (local.get $t)) (local.get $m)) (i32.const 0)))
          
    (local.set $seed (i64.and (i64.add (i64.mul (local.get $seed) (i64.const 0x5DEECE66D)) (i64.const 11)) (i64.const 0xFFFFFFFFFFFF)))
    (local.set $u (i32.wrap_i64 (i64.shr_u (local.get $seed) (i64.const 17))))
          (local.set $t (i32.rem_s (local.get $u) (local.get $bnd)))
          (br $p2)))))
    (local.set $base (i32.add (local.get $base) (local.get $t)))
      (local.set $v (i32.add (i32.div_s (i32.mul (local.get $base) (i32.const 2)) (i32.const 3)) (i32.const 1)))
      (if (i32.lt_s (local.get $v) (i32.const 2)) (then (local.set $v (i32.const 0))))
      (if (i32.ne (local.get $v) (i32.load offset=8 (local.get $p)))
        (then (local.set $ok (i32.const 0)) (br $obsEnd0)))
      ;; ---- slot 2: max(base, 2b), hidden if < 3
      
    
    (local.set $seed (i64.and (i64.add (i64.mul (local.get $seed) (i64.const 0x5DEECE66D)) (i64.const 11)) (i64.const 0xFFFFFFFFFFFF)))
    (local.set $r (i32.wrap_i64 (i64.shr_u (local.get $seed) (i64.const 17))))
    (local.set $base (i32.add (i32.add (i32.shr_u (local.get $r) (i32.const 28)) (i32.const 1)) (i32.shr_u (local.get $b) (i32.const 1))))
    (local.set $bnd (i32.add (local.get $b) (i32.const 1)))
    
    (local.set $m (i32.sub (local.get $bnd) (i32.const 1)))
    (if (i32.eqz (i32.and (local.get $bnd) (local.get $m)))
      (then 
    (local.set $seed (i64.and (i64.add (i64.mul (local.get $seed) (i64.const 0x5DEECE66D)) (i64.const 11)) (i64.const 0xFFFFFFFFFFFF)))
    (local.set $r (i32.wrap_i64 (i64.shr_u (local.get $seed) (i64.const 17))))
        (local.set $t (i32.wrap_i64 (i64.shr_s (i64.mul (i64.extend_i32_s (local.get $bnd)) (i64.extend_i32_s (local.get $r))) (i64.const 31)))))
      (else 
    (local.set $seed (i64.and (i64.add (i64.mul (local.get $seed) (i64.const 0x5DEECE66D)) (i64.const 11)) (i64.const 0xFFFFFFFFFFFF)))
    (local.set $u (i32.wrap_i64 (i64.shr_u (local.get $seed) (i64.const 17))))
        (local.set $t (i32.rem_s (local.get $u) (local.get $bnd)))
        (block $d3 (loop $p3
          (br_if $d3 (i32.ge_s (i32.add (i32.sub (local.get $u) (local.get $t)) (local.get $m)) (i32.const 0)))
          
    (local.set $seed (i64.and (i64.add (i64.mul (local.get $seed) (i64.const 0x5DEECE66D)) (i64.const 11)) (i64.const 0xFFFFFFFFFFFF)))
    (local.set $u (i32.wrap_i64 (i64.shr_u (local.get $seed) (i64.const 17))))
          (local.set $t (i32.rem_s (local.get $u) (local.get $bnd)))
          (br $p3)))))
    (local.set $base (i32.add (local.get $base) (local.get $t)))
      (local.set $v (local.get $base))
      (if (i32.lt_s (local.get $v) (i32.shl (local.get $b) (i32.const 1)))
        (then (local.set $v (i32.shl (local.get $b) (i32.const 1)))))
      (if (i32.lt_s (local.get $v) (i32.const 3)) (then (local.set $v (i32.const 0))))
      (if (i32.ne (local.get $v) (i32.load offset=12 (local.get $p)))
        (then (local.set $ok (i32.const 0)) (br $obsEnd0)))
      (local.set $p (i32.add (local.get $p) (i32.const 16)))
      (local.set $i (i32.add (local.get $i) (i32.const 1)))
      (br $obsLoop0)))
      (if (local.get $ok) (then
        (if (i32.ge_u (local.get $n) (local.get $maxOut)) (then (return (i32.const -1))))
        (i32.store (i32.add (local.get $outPtr) (i32.shl (local.get $n) (i32.const 2))) (local.get $s))
        (local.set $n (i32.add (local.get $n) (i32.const 1)))))
      (local.set $s (i32.add (local.get $s) (i32.const 1)))
      (local.set $k (i32.add (local.get $k) (i32.const 1)))
      (br $L)))
    (local.get $n))
  (export "scan" (func $scan))

  ;; ---- filter(inPtr, n, obsPtr, nObs, outPtr) -> survivors
  (func $filter (param $inPtr i32) (param $count i32) (param $obsPtr i32) (param $nObs i32)
                (param $outPtr i32) (result i32)
    (local $seed i64) (local $r i32) (local $u i32) (local $m i32) (local $bnd i32)
    (local $t i32) (local $base i32) (local $b i32) (local $v i32) (local $ok i32)
    (local $p i32) (local $i i32) (local $s i32) (local $n i32) (local $k i32)
    (local.set $n (i32.const 0))
    (local.set $k (i32.const 0))
    (block $end (loop $L
      (br_if $end (i32.ge_u (local.get $k) (local.get $count)))
      (local.set $s (i32.load (i32.add (local.get $inPtr) (i32.shl (local.get $k) (i32.const 2)))))
      
    (local.set $ok (i32.const 1))
    (local.set $p (local.get $obsPtr))
    (local.set $i (i32.const 0))
    (block $obsEnd4 (loop $obsLoop4
      (br_if $obsEnd4 (i32.ge_u (local.get $i) (local.get $nObs)))
      (local.set $b  (i32.load          (local.get $p)))
      (local.set $seed (i64.and (i64.xor (i64.extend_i32_s (local.get $s)) (i64.const 0x5DEECE66D)) (i64.const 0xFFFFFFFFFFFF)))
      ;; ---- slot 0: max(base/3,1), never hidden
      
    
    (local.set $seed (i64.and (i64.add (i64.mul (local.get $seed) (i64.const 0x5DEECE66D)) (i64.const 11)) (i64.const 0xFFFFFFFFFFFF)))
    (local.set $r (i32.wrap_i64 (i64.shr_u (local.get $seed) (i64.const 17))))
    (local.set $base (i32.add (i32.add (i32.shr_u (local.get $r) (i32.const 28)) (i32.const 1)) (i32.shr_u (local.get $b) (i32.const 1))))
    (local.set $bnd (i32.add (local.get $b) (i32.const 1)))
    
    (local.set $m (i32.sub (local.get $bnd) (i32.const 1)))
    (if (i32.eqz (i32.and (local.get $bnd) (local.get $m)))
      (then 
    (local.set $seed (i64.and (i64.add (i64.mul (local.get $seed) (i64.const 0x5DEECE66D)) (i64.const 11)) (i64.const 0xFFFFFFFFFFFF)))
    (local.set $r (i32.wrap_i64 (i64.shr_u (local.get $seed) (i64.const 17))))
        (local.set $t (i32.wrap_i64 (i64.shr_s (i64.mul (i64.extend_i32_s (local.get $bnd)) (i64.extend_i32_s (local.get $r))) (i64.const 31)))))
      (else 
    (local.set $seed (i64.and (i64.add (i64.mul (local.get $seed) (i64.const 0x5DEECE66D)) (i64.const 11)) (i64.const 0xFFFFFFFFFFFF)))
    (local.set $u (i32.wrap_i64 (i64.shr_u (local.get $seed) (i64.const 17))))
        (local.set $t (i32.rem_s (local.get $u) (local.get $bnd)))
        (block $d5 (loop $p5
          (br_if $d5 (i32.ge_s (i32.add (i32.sub (local.get $u) (local.get $t)) (local.get $m)) (i32.const 0)))
          
    (local.set $seed (i64.and (i64.add (i64.mul (local.get $seed) (i64.const 0x5DEECE66D)) (i64.const 11)) (i64.const 0xFFFFFFFFFFFF)))
    (local.set $u (i32.wrap_i64 (i64.shr_u (local.get $seed) (i64.const 17))))
          (local.set $t (i32.rem_s (local.get $u) (local.get $bnd)))
          (br $p5)))))
    (local.set $base (i32.add (local.get $base) (local.get $t)))
      (local.set $v (i32.div_s (local.get $base) (i32.const 3)))
      (if (i32.lt_s (local.get $v) (i32.const 1)) (then (local.set $v (i32.const 1))))
      (if (i32.ne (local.get $v) (i32.load offset=4 (local.get $p)))
        (then (local.set $ok (i32.const 0)) (br $obsEnd4)))
      ;; ---- slot 1: base*2/3+1, hidden if < 2
      
    
    (local.set $seed (i64.and (i64.add (i64.mul (local.get $seed) (i64.const 0x5DEECE66D)) (i64.const 11)) (i64.const 0xFFFFFFFFFFFF)))
    (local.set $r (i32.wrap_i64 (i64.shr_u (local.get $seed) (i64.const 17))))
    (local.set $base (i32.add (i32.add (i32.shr_u (local.get $r) (i32.const 28)) (i32.const 1)) (i32.shr_u (local.get $b) (i32.const 1))))
    (local.set $bnd (i32.add (local.get $b) (i32.const 1)))
    
    (local.set $m (i32.sub (local.get $bnd) (i32.const 1)))
    (if (i32.eqz (i32.and (local.get $bnd) (local.get $m)))
      (then 
    (local.set $seed (i64.and (i64.add (i64.mul (local.get $seed) (i64.const 0x5DEECE66D)) (i64.const 11)) (i64.const 0xFFFFFFFFFFFF)))
    (local.set $r (i32.wrap_i64 (i64.shr_u (local.get $seed) (i64.const 17))))
        (local.set $t (i32.wrap_i64 (i64.shr_s (i64.mul (i64.extend_i32_s (local.get $bnd)) (i64.extend_i32_s (local.get $r))) (i64.const 31)))))
      (else 
    (local.set $seed (i64.and (i64.add (i64.mul (local.get $seed) (i64.const 0x5DEECE66D)) (i64.const 11)) (i64.const 0xFFFFFFFFFFFF)))
    (local.set $u (i32.wrap_i64 (i64.shr_u (local.get $seed) (i64.const 17))))
        (local.set $t (i32.rem_s (local.get $u) (local.get $bnd)))
        (block $d6 (loop $p6
          (br_if $d6 (i32.ge_s (i32.add (i32.sub (local.get $u) (local.get $t)) (local.get $m)) (i32.const 0)))
          
    (local.set $seed (i64.and (i64.add (i64.mul (local.get $seed) (i64.const 0x5DEECE66D)) (i64.const 11)) (i64.const 0xFFFFFFFFFFFF)))
    (local.set $u (i32.wrap_i64 (i64.shr_u (local.get $seed) (i64.const 17))))
          (local.set $t (i32.rem_s (local.get $u) (local.get $bnd)))
          (br $p6)))))
    (local.set $base (i32.add (local.get $base) (local.get $t)))
      (local.set $v (i32.add (i32.div_s (i32.mul (local.get $base) (i32.const 2)) (i32.const 3)) (i32.const 1)))
      (if (i32.lt_s (local.get $v) (i32.const 2)) (then (local.set $v (i32.const 0))))
      (if (i32.ne (local.get $v) (i32.load offset=8 (local.get $p)))
        (then (local.set $ok (i32.const 0)) (br $obsEnd4)))
      ;; ---- slot 2: max(base, 2b), hidden if < 3
      
    
    (local.set $seed (i64.and (i64.add (i64.mul (local.get $seed) (i64.const 0x5DEECE66D)) (i64.const 11)) (i64.const 0xFFFFFFFFFFFF)))
    (local.set $r (i32.wrap_i64 (i64.shr_u (local.get $seed) (i64.const 17))))
    (local.set $base (i32.add (i32.add (i32.shr_u (local.get $r) (i32.const 28)) (i32.const 1)) (i32.shr_u (local.get $b) (i32.const 1))))
    (local.set $bnd (i32.add (local.get $b) (i32.const 1)))
    
    (local.set $m (i32.sub (local.get $bnd) (i32.const 1)))
    (if (i32.eqz (i32.and (local.get $bnd) (local.get $m)))
      (then 
    (local.set $seed (i64.and (i64.add (i64.mul (local.get $seed) (i64.const 0x5DEECE66D)) (i64.const 11)) (i64.const 0xFFFFFFFFFFFF)))
    (local.set $r (i32.wrap_i64 (i64.shr_u (local.get $seed) (i64.const 17))))
        (local.set $t (i32.wrap_i64 (i64.shr_s (i64.mul (i64.extend_i32_s (local.get $bnd)) (i64.extend_i32_s (local.get $r))) (i64.const 31)))))
      (else 
    (local.set $seed (i64.and (i64.add (i64.mul (local.get $seed) (i64.const 0x5DEECE66D)) (i64.const 11)) (i64.const 0xFFFFFFFFFFFF)))
    (local.set $u (i32.wrap_i64 (i64.shr_u (local.get $seed) (i64.const 17))))
        (local.set $t (i32.rem_s (local.get $u) (local.get $bnd)))
        (block $d7 (loop $p7
          (br_if $d7 (i32.ge_s (i32.add (i32.sub (local.get $u) (local.get $t)) (local.get $m)) (i32.const 0)))
          
    (local.set $seed (i64.and (i64.add (i64.mul (local.get $seed) (i64.const 0x5DEECE66D)) (i64.const 11)) (i64.const 0xFFFFFFFFFFFF)))
    (local.set $u (i32.wrap_i64 (i64.shr_u (local.get $seed) (i64.const 17))))
          (local.set $t (i32.rem_s (local.get $u) (local.get $bnd)))
          (br $p7)))))
    (local.set $base (i32.add (local.get $base) (local.get $t)))
      (local.set $v (local.get $base))
      (if (i32.lt_s (local.get $v) (i32.shl (local.get $b) (i32.const 1)))
        (then (local.set $v (i32.shl (local.get $b) (i32.const 1)))))
      (if (i32.lt_s (local.get $v) (i32.const 3)) (then (local.set $v (i32.const 0))))
      (if (i32.ne (local.get $v) (i32.load offset=12 (local.get $p)))
        (then (local.set $ok (i32.const 0)) (br $obsEnd4)))
      (local.set $p (i32.add (local.get $p) (i32.const 16)))
      (local.set $i (i32.add (local.get $i) (i32.const 1)))
      (br $obsLoop4)))
      (if (local.get $ok) (then
        (i32.store (i32.add (local.get $outPtr) (i32.shl (local.get $n) (i32.const 2))) (local.get $s))
        (local.set $n (i32.add (local.get $n) (i32.const 1)))))
      (local.set $k (i32.add (local.get $k) (i32.const 1)))
      (br $L)))
    (local.get $n))
  (export "filter" (func $filter))

  ;; ---- costs(xpSeed, bookshelves, outPtr): the three displayed costs
  (func $costs (param $xs i32) (param $bk i32) (param $outPtr i32)
    (local $seed i64) (local $r i32) (local $u i32) (local $m i32) (local $bnd i32)
    (local $t i32) (local $base i32) (local $b i32) (local $v i32) (local $ok i32)
    (local $p i32) (local $i i32) (local $s i32) (local $n i32) (local $k i32)
    (local.set $b (local.get $bk))
    (local.set $seed (i64.and (i64.xor (i64.extend_i32_s (local.get $xs)) (i64.const 0x5DEECE66D)) (i64.const 0xFFFFFFFFFFFF)))
    
    
    (local.set $seed (i64.and (i64.add (i64.mul (local.get $seed) (i64.const 0x5DEECE66D)) (i64.const 11)) (i64.const 0xFFFFFFFFFFFF)))
    (local.set $r (i32.wrap_i64 (i64.shr_u (local.get $seed) (i64.const 17))))
    (local.set $base (i32.add (i32.add (i32.shr_u (local.get $r) (i32.const 28)) (i32.const 1)) (i32.shr_u (local.get $b) (i32.const 1))))
    (local.set $bnd (i32.add (local.get $b) (i32.const 1)))
    
    (local.set $m (i32.sub (local.get $bnd) (i32.const 1)))
    (if (i32.eqz (i32.and (local.get $bnd) (local.get $m)))
      (then 
    (local.set $seed (i64.and (i64.add (i64.mul (local.get $seed) (i64.const 0x5DEECE66D)) (i64.const 11)) (i64.const 0xFFFFFFFFFFFF)))
    (local.set $r (i32.wrap_i64 (i64.shr_u (local.get $seed) (i64.const 17))))
        (local.set $t (i32.wrap_i64 (i64.shr_s (i64.mul (i64.extend_i32_s (local.get $bnd)) (i64.extend_i32_s (local.get $r))) (i64.const 31)))))
      (else 
    (local.set $seed (i64.and (i64.add (i64.mul (local.get $seed) (i64.const 0x5DEECE66D)) (i64.const 11)) (i64.const 0xFFFFFFFFFFFF)))
    (local.set $u (i32.wrap_i64 (i64.shr_u (local.get $seed) (i64.const 17))))
        (local.set $t (i32.rem_s (local.get $u) (local.get $bnd)))
        (block $d8 (loop $p8
          (br_if $d8 (i32.ge_s (i32.add (i32.sub (local.get $u) (local.get $t)) (local.get $m)) (i32.const 0)))
          
    (local.set $seed (i64.and (i64.add (i64.mul (local.get $seed) (i64.const 0x5DEECE66D)) (i64.const 11)) (i64.const 0xFFFFFFFFFFFF)))
    (local.set $u (i32.wrap_i64 (i64.shr_u (local.get $seed) (i64.const 17))))
          (local.set $t (i32.rem_s (local.get $u) (local.get $bnd)))
          (br $p8)))))
    (local.set $base (i32.add (local.get $base) (local.get $t)))
    (local.set $v (i32.div_s (local.get $base) (i32.const 3)))
    (if (i32.lt_s (local.get $v) (i32.const 1)) (then (local.set $v (i32.const 1))))
    (i32.store (local.get $outPtr) (local.get $v))
    
    
    (local.set $seed (i64.and (i64.add (i64.mul (local.get $seed) (i64.const 0x5DEECE66D)) (i64.const 11)) (i64.const 0xFFFFFFFFFFFF)))
    (local.set $r (i32.wrap_i64 (i64.shr_u (local.get $seed) (i64.const 17))))
    (local.set $base (i32.add (i32.add (i32.shr_u (local.get $r) (i32.const 28)) (i32.const 1)) (i32.shr_u (local.get $b) (i32.const 1))))
    (local.set $bnd (i32.add (local.get $b) (i32.const 1)))
    
    (local.set $m (i32.sub (local.get $bnd) (i32.const 1)))
    (if (i32.eqz (i32.and (local.get $bnd) (local.get $m)))
      (then 
    (local.set $seed (i64.and (i64.add (i64.mul (local.get $seed) (i64.const 0x5DEECE66D)) (i64.const 11)) (i64.const 0xFFFFFFFFFFFF)))
    (local.set $r (i32.wrap_i64 (i64.shr_u (local.get $seed) (i64.const 17))))
        (local.set $t (i32.wrap_i64 (i64.shr_s (i64.mul (i64.extend_i32_s (local.get $bnd)) (i64.extend_i32_s (local.get $r))) (i64.const 31)))))
      (else 
    (local.set $seed (i64.and (i64.add (i64.mul (local.get $seed) (i64.const 0x5DEECE66D)) (i64.const 11)) (i64.const 0xFFFFFFFFFFFF)))
    (local.set $u (i32.wrap_i64 (i64.shr_u (local.get $seed) (i64.const 17))))
        (local.set $t (i32.rem_s (local.get $u) (local.get $bnd)))
        (block $d9 (loop $p9
          (br_if $d9 (i32.ge_s (i32.add (i32.sub (local.get $u) (local.get $t)) (local.get $m)) (i32.const 0)))
          
    (local.set $seed (i64.and (i64.add (i64.mul (local.get $seed) (i64.const 0x5DEECE66D)) (i64.const 11)) (i64.const 0xFFFFFFFFFFFF)))
    (local.set $u (i32.wrap_i64 (i64.shr_u (local.get $seed) (i64.const 17))))
          (local.set $t (i32.rem_s (local.get $u) (local.get $bnd)))
          (br $p9)))))
    (local.set $base (i32.add (local.get $base) (local.get $t)))
    (local.set $v (i32.add (i32.div_s (i32.mul (local.get $base) (i32.const 2)) (i32.const 3)) (i32.const 1)))
    (if (i32.lt_s (local.get $v) (i32.const 2)) (then (local.set $v (i32.const 0))))
    (i32.store offset=4 (local.get $outPtr) (local.get $v))
    
    
    (local.set $seed (i64.and (i64.add (i64.mul (local.get $seed) (i64.const 0x5DEECE66D)) (i64.const 11)) (i64.const 0xFFFFFFFFFFFF)))
    (local.set $r (i32.wrap_i64 (i64.shr_u (local.get $seed) (i64.const 17))))
    (local.set $base (i32.add (i32.add (i32.shr_u (local.get $r) (i32.const 28)) (i32.const 1)) (i32.shr_u (local.get $b) (i32.const 1))))
    (local.set $bnd (i32.add (local.get $b) (i32.const 1)))
    
    (local.set $m (i32.sub (local.get $bnd) (i32.const 1)))
    (if (i32.eqz (i32.and (local.get $bnd) (local.get $m)))
      (then 
    (local.set $seed (i64.and (i64.add (i64.mul (local.get $seed) (i64.const 0x5DEECE66D)) (i64.const 11)) (i64.const 0xFFFFFFFFFFFF)))
    (local.set $r (i32.wrap_i64 (i64.shr_u (local.get $seed) (i64.const 17))))
        (local.set $t (i32.wrap_i64 (i64.shr_s (i64.mul (i64.extend_i32_s (local.get $bnd)) (i64.extend_i32_s (local.get $r))) (i64.const 31)))))
      (else 
    (local.set $seed (i64.and (i64.add (i64.mul (local.get $seed) (i64.const 0x5DEECE66D)) (i64.const 11)) (i64.const 0xFFFFFFFFFFFF)))
    (local.set $u (i32.wrap_i64 (i64.shr_u (local.get $seed) (i64.const 17))))
        (local.set $t (i32.rem_s (local.get $u) (local.get $bnd)))
        (block $d10 (loop $p10
          (br_if $d10 (i32.ge_s (i32.add (i32.sub (local.get $u) (local.get $t)) (local.get $m)) (i32.const 0)))
          
    (local.set $seed (i64.and (i64.add (i64.mul (local.get $seed) (i64.const 0x5DEECE66D)) (i64.const 11)) (i64.const 0xFFFFFFFFFFFF)))
    (local.set $u (i32.wrap_i64 (i64.shr_u (local.get $seed) (i64.const 17))))
          (local.set $t (i32.rem_s (local.get $u) (local.get $bnd)))
          (br $p10)))))
    (local.set $base (i32.add (local.get $base) (local.get $t)))
    (local.set $v (local.get $base))
    (if (i32.lt_s (local.get $v) (i32.shl (local.get $b) (i32.const 1)))
      (then (local.set $v (i32.shl (local.get $b) (i32.const 1)))))
    (if (i32.lt_s (local.get $v) (i32.const 3)) (then (local.set $v (i32.const 0))))
    (i32.store offset=8 (local.get $outPtr) (local.get $v)))
  (export "costs" (func $costs))

  ;; ---- playerSeed(xp1, xp2, outPtr) -> found; state written as lo32,hi16
  (func $playerSeed (param $xp1 i32) (param $xp2 i32) (param $outPtr i32) (result i32)
    (local $hi i64) (local $lo i32) (local $cand i64) (local $next i64) (local $target i64)
    (local.set $hi (i64.and (i64.shl (i64.extend_i32_u (local.get $xp1)) (i64.const 16)) (i64.const 0xFFFFFFFF0000)))
    (local.set $target (i64.and (i64.shl (i64.extend_i32_u (local.get $xp2)) (i64.const 16)) (i64.const 0xFFFFFFFF0000)))
    (local.set $lo (i32.const 0))
    (block $out (loop $l
      (br_if $out (i32.ge_u (local.get $lo) (i32.const 65536)))
      (local.set $cand (i64.or (local.get $hi) (i64.extend_i32_u (local.get $lo))))
      (local.set $next (i64.and (i64.add (i64.mul (local.get $cand) (i64.const 0x5DEECE66D)) (i64.const 11)) (i64.const 0xFFFFFFFFFFFF)))
      (if (i64.eq (i64.and (local.get $next) (i64.const 0xFFFFFFFF0000)) (local.get $target))
        (then
          (i32.store (local.get $outPtr) (i32.wrap_i64 (i64.and (local.get $next) (i64.const 0xFFFFFFFF))))
          (i32.store offset=4 (local.get $outPtr) (i32.wrap_i64 (i64.shr_u (local.get $next) (i64.const 32))))
          (return (i32.const 1))))
      (local.set $lo (i32.add (local.get $lo) (i32.const 1)))
      (br $l)))
    (i32.const 0))
  (export "playerSeed" (func $playerSeed))
)
