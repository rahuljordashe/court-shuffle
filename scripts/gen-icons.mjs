// Generates PNG app icons with no external dependencies.
// Mark: "Court" — a top-down pickleball court (boundary, kitchen lines,
// centre lines, net with posts) in paper on the signal vermilion field.
import { deflateSync } from 'node:zlib'
import { writeFileSync, mkdirSync } from 'node:fs'

const CRC = (() => {
  const t = []
  for (let n = 0; n < 256; n++) {
    let c = n
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    t[n] = c >>> 0
  }
  return t
})()

function crc32(buf) {
  let c = 0xffffffff
  for (let i = 0; i < buf.length; i++) c = CRC[(c ^ buf[i]) & 0xff] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}

function chunk(type, data) {
  const t = Buffer.from(type, 'ascii')
  const len = Buffer.alloc(4)
  len.writeUInt32BE(data.length, 0)
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(Buffer.concat([t, data])), 0)
  return Buffer.concat([len, t, data, crc])
}

// The mark, defined on a 512 canvas. Court lines are all axis-aligned, so the
// whole icon is the vermilion field plus this list of paper rectangles.
const SIGNAL = [192, 67, 42] // vermilion field
const PAPER = [247, 244, 239] // court lines
const MARK = [
  [140, 104, 232, 15], // boundary: top rail
  [140, 393, 232, 15], // boundary: bottom rail
  [140, 104, 15, 304], // boundary: left rail
  [357, 104, 15, 304], // boundary: right rail
  [140, 199, 232, 10], // non-volley (kitchen) line, near side
  [140, 303, 232, 10], // non-volley (kitchen) line, far side
  [251, 104, 10, 100], // centre line, near half
  [251, 308, 10, 100], // centre line, far half
  [112, 243, 288, 26], // net, posts overhanging the sidelines
]

function png(size) {
  const raw = Buffer.alloc(size * (size * 4 + 1))
  const k = size / 512
  const SS = 4 // supersample for clean edges at any size
  for (let y = 0; y < size; y++) {
    const row = y * (size * 4 + 1)
    raw[row] = 0 // PNG filter byte
    for (let x = 0; x < size; x++) {
      let hits = 0
      for (let sy = 0; sy < SS; sy++) {
        const Y = (y + (sy + 0.5) / SS) / k
        for (let sx = 0; sx < SS; sx++) {
          const X = (x + (sx + 0.5) / SS) / k
          for (let m = 0; m < MARK.length; m++) {
            const [rx, ry, rw, rh] = MARK[m]
            if (X >= rx && X < rx + rw && Y >= ry && Y < ry + rh) {
              hits++
              break
            }
          }
        }
      }
      const t = hits / (SS * SS)
      const i = row + 1 + x * 4
      raw[i] = Math.round(SIGNAL[0] + (PAPER[0] - SIGNAL[0]) * t)
      raw[i + 1] = Math.round(SIGNAL[1] + (PAPER[1] - SIGNAL[1]) * t)
      raw[i + 2] = Math.round(SIGNAL[2] + (PAPER[2] - SIGNAL[2]) * t)
      raw[i + 3] = 255
    }
  }
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(size, 0)
  ihdr.writeUInt32BE(size, 4)
  ihdr[8] = 8 // bit depth
  ihdr[9] = 6 // colour type RGBA
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])
  return Buffer.concat([
    sig,
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw)),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

mkdirSync('public', { recursive: true })
writeFileSync('public/icon-192.png', png(192))
writeFileSync('public/icon-512.png', png(512))
// Court content sits inside the maskable safe zone, so one image serves both.
writeFileSync('public/maskable-512.png', png(512))
console.log('icons generated: icon-192.png, icon-512.png, maskable-512.png')
