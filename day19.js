'use strict'    //  day19 - interpreting scanner data.

const { findRotation, getOffset, reverse, rotate, shift } = require('./day19rotations')
const { assert, loadData, parseInt } = require('./core/utils')
const { intersection } = require('lodash')
const { abs, max } = Math
const rawInput = [loadData(module.filename), loadData(module.filename, 'demo')]

const parse = (dsn) => {
  let input = rawInput[dsn]
  const data = []

  if (input && (input = input.split('\n'))) {
    for (let line, iLine = 0, readings; (line = input[iLine++]) !== undefined;) {
      if (line) {
        if (/^---\sscanner\s\d+\s---$/i.exec(line)) {
          data.push(readings = [])
        } else {
          readings.push(line.split(',').map(parseInt))
        }
      }
    }
    return { beacons: undefined, scanBlocks: data }
  }
}

/** @typedef {[number,number,number]} TPoint */

/**
 * @typedef {{
 * diffs: TPoint[],
 * [offset]: TPoint,
 * pairs: [number, number][]
 * [rotation]: number,
 * scans: TPoint[]
 * }} TBlock
 */

/**
 * @param {number}  x
 * @param {number}  y
 * @param {number}  z
 * @param {TPoint}  pointB
 * @return {TPoint} squared distances by all 3 projections
 */
const getDistances = ([x, y, z], pointB) => {
  x -= pointB[0], y -= pointB[1], z -= pointB[2]
  x *= x, y *= y, z *= z

  return [y + z, x + z, x + y]
}

/**
 * @param {[number, number, number][]} pointReadings
 * @return {TBlock}
 */
const composeBlock = (pointReadings) => {
  const diffs = [], pairs = [], scans = pointReadings.slice()

  for (let i = 0; i < scans.length; ++i) {
    for (let j = 0; j < i; ++j) {
      diffs.push(getDistances(pointReadings[i], pointReadings[j]))
      pairs.push([j, i])
    }
  }

  return { diffs, offset: [0, 0, 0], pairs, rotation: undefined, scans }
}

const doSetsMatch = (a, b) => {
  let b1 = b.slice(0, 3), n = b1.length

  for (let iA = 0, iB, vA; iA < 3; ++iA) {
    if ((iB = b1.indexOf(a[iA])) >= 0 && iB < 3) {
      b1[iB] = undefined, --n
    }
  }
  return n === 0
}

/**
 * @param {number} value
 * @param {number[]} pairs
 * @param {number} start
 */
const indexesOfPairsContaining = (value, pairs, start) => {
  const result = []

  for (let i = start; (i = pairs.indexOf(value, i)) >= 0; ++i) {
    result.push(i >> 1)
  }

  return result
}

/**
 * @param {TBlock} blockA
 * @param {TBlock} blockB
 */
const findSimilarPairs = (blockA, blockB) => {
  const indexesA = [], indexesB = [], idxA = [], idxB = []

  for (let i = 0, dA; (dA = blockA.diffs[i]); i += 1) {
    for (let j = 0, dB, v; (dB = blockB.diffs[j]); j += 1) {
      if (doSetsMatch(dA, dB)) {
        indexesA.push(...blockA.pairs[i])
        indexesB.push(...blockB.pairs[j])
      }
    }
  }
  //  The best transform must have at least 12 fits.
  for (let i = 0, indexA, indexB, a, b, c; (indexA = indexesA[i]) !== undefined; ++i) {
    if (!idxA.includes(indexA)) {
      if ((a = indexesOfPairsContaining(indexA, indexesA, i)).length > 1) {
        b = c = undefined
        if (!idxB.includes(indexB = indexesB[i])) {
          if ((b = indexesOfPairsContaining(indexB, indexesB, 0)).length > 1) {
            if (intersection(a, b).length > 1) {
              idxA.push(indexA)
              idxB.push(indexB)
            }
          }
        }
        if (!idxB.includes(indexB = indexesB[i ^ 1])) {
          if ((b = indexesOfPairsContaining(indexB, indexesB, 0)).length > 1) {
            if (intersection(a, b).length > 1) {
              assert(!idxA.includes(indexA), 'inc')
              idxA.push(indexA)
              idxB.push(indexB)
            }
          }
        }
      }
    }
  }

  if (idxA.length >= 12) {
    let r = findRotation(blockA.scans[idxA[0]], blockA.scans[idxA[1]],
      blockB.scans[idxB[0]], blockB.scans[idxB[1]])
    let q = findRotation(blockA.scans[idxA[1]], blockA.scans[idxA[2]],
      blockB.scans[idxB[1]], blockB.scans[idxB[2]])
    assert(r !== undefined)
    assert(r === q)
    let points = blockB.scans.map(p => rotate(p, r))
    const offs = getOffset(points[idxB[0]], blockA.scans[idxA[0]])
    points = points.map(p => shift(p, offs))
    blockB.scans = points
    blockB.rotation = r
    blockB.offset = offs
    return true
  }
  return false
}

/**
 * @param {TPoint[][]} input - a block contains scans from one scanner.
 * @return {TPoint[]} beacons
 */
const solve1 = (input) => {
  let was
  /** @type {TBlock[]} */
  const blocks = input.map(composeBlock)

  blocks[0].rotation = 0

  do {
    was = false

    for (let i = 0; i < blocks.length; ++i) {
      if (blocks[i].rotation !== undefined) {
        for (let j = 0; j < blocks.length; ++j) {
          if (j !== i && blocks[j].rotation === undefined) {
            was |= findSimilarPairs(blocks[i], blocks[j])
          }
        }
      }
    }
  } while (was)

  const beacons = []

  for (const block of blocks) {
    for (const [x, y, z] of block.scans) {
      if (!beacons.find(([a, b, c]) => a === x && b === y && c === z)) {
        beacons.push([x, y, z])
      }
    }
  }

  return beacons
}

/**
 * @param {{beacons: TPoint[], scanBlocks:TPoint[][]}} input
 */
const puzzle1 = (input) => {
  return (input.beacons = solve1(input.scanBlocks)).length
}

const manhattan = ([a, b, c], [d, e, f]) => abs(a - d) + abs(b - e) + abs(c - f)

/**
 * @param {TPoint[]} beacons
 */
const puzzle2 = ({ beacons }) => {
  let longest = 0

  for (let i = 0; i < beacons.length; ++i) {
    for (let j = 0; j < i; ++j) {
      longest = max(longest, manhattan(beacons[i], beacons[j]))
    }
  }

  return longest
}

module.exports = { parse, puzzles: [puzzle1, puzzle2] }

/*
 */

/** @type Map<number,number[]> */
