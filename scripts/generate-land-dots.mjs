import { readFile, writeFile } from 'node:fs/promises'
import { geoContains } from 'd3-geo'
import { feature } from 'topojson-client'

const atlasUrl = new URL('../node_modules/world-atlas/countries-110m.json', import.meta.url)
const outputUrl = new URL('../src/data/worldLandDots.ts', import.meta.url)
const topology = JSON.parse(await readFile(atlasUrl, 'utf8'))
const land = feature(topology, topology.objects.countries)
const spacing = 2.5
const dots = []

for (let latitude = -82.5, row = 0; latitude <= 82.5; latitude += spacing, row += 1) {
  const offset = row % 2 ? spacing / 2 : 0
  for (let longitude = -180 + offset; longitude < 180; longitude += spacing) {
    if (geoContains(land, [longitude, latitude])) {
      dots.push([Number(longitude.toFixed(2)), Number(latitude.toFixed(2))])
    }
  }
}

const source = `// Generated from Natural Earth data via world-atlas. Do not edit by hand.\n`
  + `export const worldLandDots: ReadonlyArray<readonly [number, number]> = ${JSON.stringify(dots)}\n`

await writeFile(outputUrl, source)
console.log(`Generated ${dots.length} local land dots.`)
