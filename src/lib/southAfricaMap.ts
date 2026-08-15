import { geoMercator, geoPath } from 'd3'
import type { Feature, FeatureCollection, MultiPolygon } from 'geojson'
import { southAfricaProvinces } from '../data/southAfricaProvinces'

export const SA_MAP_WIDTH = 1000
export const SA_MAP_HEIGHT = 900
const padding = 44

export interface ProvinceProperties {
  name: string
}

export const southAfricaProvinceFeatures: Feature<MultiPolygon, ProvinceProperties>[] = (
  southAfricaProvinces.map((province) => ({
    type: 'Feature',
    properties: { name: province.name },
    geometry: {
      type: 'MultiPolygon',
      coordinates: province.coordinates as unknown as MultiPolygon['coordinates'],
    },
  }))
)

const southAfricaFeatureCollection: FeatureCollection<MultiPolygon, ProvinceProperties> = {
  type: 'FeatureCollection',
  features: southAfricaProvinceFeatures,
}

export const southAfricaProjection = geoMercator().fitExtent(
  [[padding, padding], [SA_MAP_WIDTH - padding, SA_MAP_HEIGHT - padding]],
  southAfricaFeatureCollection,
)

export const southAfricaPath = geoPath(southAfricaProjection)

export function projectPoint(longitude: number, latitude: number): [number, number] | null {
  return southAfricaProjection([longitude, latitude])
}
