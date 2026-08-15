import { readFile, writeFile } from 'node:fs/promises'

// Source: https://gist.github.com/MeganBeckett/9101ba77bd0af06fd003ea5c99d051ab
const sourceUrl = new URL('./source-data/sa-provinces.geojson', import.meta.url)
const outputUrl = new URL('../src/data/southAfricaProvinces.ts', import.meta.url)

const epsilon = 0.01
const islandLatitudeThreshold = -36

function perpendicularDistance([x, y], [x1, y1], [x2, y2]) {
  const dx = x2 - x1
  const dy = y2 - y1
  if (dx === 0 && dy === 0) return Math.hypot(x - x1, y - y1)

  const t = Math.max(0, Math.min(1, ((x - x1) * dx + (y - y1) * dy) / (dx * dx + dy * dy)))
  return Math.hypot(x - (x1 + t * dx), y - (y1 + t * dy))
}

function simplifyRing(points, tolerance) {
  if (points.length < 3) return points

  let maxDistance = 0
  let splitIndex = 0
  const end = points.length - 1
  for (let i = 1; i < end; i += 1) {
    const distance = perpendicularDistance(points[i], points[0], points[end])
    if (distance > maxDistance) {
      maxDistance = distance
      splitIndex = i
    }
  }

  if (maxDistance <= tolerance) return [points[0], points[end]]

  const left = simplifyRing(points.slice(0, splitIndex + 1), tolerance)
  const right = simplifyRing(points.slice(splitIndex), tolerance)
  return [...left.slice(0, -1), ...right]
}

function isIslandPolygon(polygon) {
  return polygon.every((ring) => ring.every(([, latitude]) => latitude < islandLatitudeThreshold))
}

function round(value) {
  return Number(value.toFixed(4))
}

const geojson = JSON.parse(await readFile(sourceUrl, 'utf8'))
const provinces = []

for (const featureItem of geojson.features) {
  const name = featureItem.properties.name
  const beforePolygons = featureItem.geometry.coordinates
  const droppedIslands = beforePolygons.filter(isIslandPolygon).length
  const mainlandPolygons = beforePolygons.filter((polygon) => !isIslandPolygon(polygon))

  let beforePoints = 0
  let afterPoints = 0

  const coordinates = mainlandPolygons.map((polygon) => polygon.map((ring) => {
    beforePoints += ring.length
    const simplified = simplifyRing(ring, epsilon).map(([longitude, latitude]) => [
      round(longitude),
      round(latitude),
    ])
    afterPoints += simplified.length
    return simplified
  }))

  provinces.push({ name, coordinates })
  const islandNote = droppedIslands ? `, dropped ${droppedIslands} island polygon(s)` : ''
  console.log(`${name}: ${beforePoints} -> ${afterPoints} points${islandNote}`)
}

const totalBefore = geojson.features.reduce((sum, featureItem) => (
  sum + featureItem.geometry.coordinates.reduce((polySum, polygon) => (
    polySum + polygon.reduce((ringSum, ring) => ringSum + ring.length, 0)
  ), 0)
), 0)
const totalAfter = provinces.reduce((sum, province) => (
  sum + province.coordinates.reduce((polySum, polygon) => (
    polySum + polygon.reduce((ringSum, ring) => ringSum + ring.length, 0)
  ), 0)
), 0)
console.log(`TOTAL: ${totalBefore} -> ${totalAfter} points`)

const source = `// Generated from scripts/source-data/sa-provinces.geojson via\n`
  + `// scripts/generate-south-africa-provinces.mjs. Do not edit by hand.\n`
  + `export interface SouthAfricaProvince {\n`
  + `  readonly name: string\n`
  + `  readonly coordinates: readonly (readonly (readonly (readonly [number, number])[])[])[]\n`
  + `}\n\n`
  + `export const southAfricaProvinces: readonly SouthAfricaProvince[] = ${JSON.stringify(provinces)}\n`

await writeFile(outputUrl, source)
console.log(`Wrote ${provinces.length} provinces to src/data/southAfricaProvinces.ts`)
