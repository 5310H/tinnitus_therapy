function main() {

  const p = jscad.primitives
  const t = jscad.transforms.translate
  const r = jscad.transforms.rotate
  const u = jscad.booleans.union
  const s = jscad.booleans.subtract

  const left  = t([-25,0,0], makeSaddle(true, p, t, r, u, s))
  const right = t([25,0,0], makeSaddle(false, p, t, r, u, s))

  return [left, right]
}

function makeSaddle(isLeft, p, t, r, u, s) {

  const clipOuter = p.cuboid({ size:[20,16,20] })
  const clipInner = p.cuboid({ size:[10.2,9.6,22] })
  const clipOpening = t([0,-12,0], p.cuboid({ size:[4,24,24] }))
  const clip = s(clipOuter, clipInner, clipOpening)

  const armCore = t([8,0,-4], p.cuboid({ size:[14,6,6] }))
  const armUndercut = t([12,0,-8], r([15,0,0], p.cuboid({ size:[16,8,8] })))
  const arm = s(armCore, armUndercut)

  const cradleOuter = p.cuboid({ size:[14,14,5] })
  const cradleInner = p.cuboid({ size:[10.4,10.4,6] })
  const cornerCut = p.cuboid({ size:[3,3,8] })

  const c1 = t([5,5,0], cornerCut)
  const c2 = t([-5,5,0], cornerCut)
  const c3 = t([5,-5,0], cornerCut)
  const c4 = t([-5,-5,0], cornerCut)
  const corners = u(c1, c2, c3, c4)

  let cradle = s(cradleOuter, cradleInner, corners)
  cradle = r([0,10,0], cradle)
  cradle = t([13,0.9,-4], cradle)

  const topLip = t([13,0.9,-1], p.cuboid({ size:[12,2,2] }))
  const bottomLip = t([13,0.9,-7], p.cuboid({ size:[12,2,2] }))

  let antiTab = null
  if (isLeft) antiTab = t([13,5,-4], p.cuboid({ size:[4,2,4] }))

  const wireGrooveTop = t([4,-8,-1], p.cuboid({ size:[22,2,1.6] }))
  const rearWireRelief = t([-8,-8,-2], p.cuboid({ size:[6,2,4] }))

  let wireGrooveDown = null
  if (isLeft) wireGrooveDown = t([0,-8,-2], p.cuboid({ size:[2,2,14] }))

  const padBlock1 = t([18,0,-4], p.cuboid({ size:[10,10,4] }))
  const padBlock2 = t([21,0,-4], p.cuboid({ size:[6,10,4] }))
  const padRound = t([22,0,-4], p.cylinder({ radius:5, height:4, segments:32 }))

  let pad = u(padBlock1, padBlock2, padRound)
  pad = r([0,8,0], pad)

  let solid = u(clip, arm, cradle, topLip, bottomLip, pad)
  if (antiTab) solid = u(solid, antiTab)

  let cuts = u(wireGrooveTop, rearWireRelief)
  if (wireGrooveDown) cuts = u(cuts, wireGrooveDown)

  solid = s(solid, cuts)

  return solid
}