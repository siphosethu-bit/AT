export interface SouthAfricaCityLabel {
  readonly name: string
  readonly latitude: number
  readonly longitude: number
  /** Label reads to the left of its marker instead of the default right — used where the
   * default placement would collide with a close neighbour (e.g. Rustenburg/Pretoria). */
  readonly labelAlign?: 'left'
}

export const southAfricaCityLabels: readonly SouthAfricaCityLabel[] = [
  { name: 'Polokwane', latitude: -23.9045, longitude: 29.4689 },
  { name: 'Rustenburg', latitude: -25.6672, longitude: 27.2424, labelAlign: 'left' },
  { name: 'Pretoria', latitude: -25.7479, longitude: 28.2293 },
  { name: 'Mbombela', latitude: -25.4753, longitude: 30.9694 },
  { name: 'Kimberley', latitude: -28.7282, longitude: 24.7499 },
  { name: 'Pietermaritzburg', latitude: -29.6006, longitude: 30.3794, labelAlign: 'left' },
  { name: 'Durban', latitude: -29.8587, longitude: 31.0218 },
  { name: 'Mthatha', latitude: -31.5889, longitude: 28.7844 },
  { name: 'East London', latitude: -33.0153, longitude: 27.9116 },
  { name: 'Gqeberha', latitude: -33.9608, longitude: 25.6022 },
  { name: 'George', latitude: -33.9628, longitude: 22.4619 },
  { name: 'Stellenbosch', latitude: -33.9321, longitude: 18.8602 },
]
