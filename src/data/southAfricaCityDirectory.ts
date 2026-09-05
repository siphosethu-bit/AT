// Canonical South African city/town directory shared by the community signup city field and
// the "Bring Internet Athi to my city" tour-request feature. Coordinates are approximate city
// centres — accurate enough to place a marker on the illustrative Live Programme map, not for
// precise geolocation. Never restrict user input to this list; it only powers autocomplete and
// province/coordinate lookup for recognised names.
export interface SouthAfricaCityDirectoryEntry {
  readonly name: string
  readonly province: string
  readonly latitude: number
  readonly longitude: number
}

export const southAfricaCityDirectory: readonly SouthAfricaCityDirectoryEntry[] = [
  { name: 'Johannesburg', province: 'Gauteng', latitude: -26.2041, longitude: 28.0473 },
  { name: 'Cape Town', province: 'Western Cape', latitude: -33.9249, longitude: 18.4241 },
  { name: 'Pretoria', province: 'Gauteng', latitude: -25.7479, longitude: 28.2293 },
  { name: 'Durban', province: 'KwaZulu-Natal', latitude: -29.8587, longitude: 31.0218 },
  { name: 'Gqeberha', province: 'Eastern Cape', latitude: -33.9608, longitude: 25.6022 },
  { name: 'East London', province: 'Eastern Cape', latitude: -33.0153, longitude: 27.9116 },
  { name: 'Bloemfontein', province: 'Free State', latitude: -29.0852, longitude: 26.1596 },
  { name: 'Polokwane', province: 'Limpopo', latitude: -23.9045, longitude: 29.4689 },
  { name: 'Mbombela', province: 'Mpumalanga', latitude: -25.4753, longitude: 30.9694 },
  { name: 'Kimberley', province: 'Northern Cape', latitude: -28.7282, longitude: 24.7499 },
  { name: 'Mahikeng', province: 'North West', latitude: -25.856, longitude: 25.6403 },
  { name: 'Soweto', province: 'Gauteng', latitude: -26.2678, longitude: 27.8585 },
  { name: 'Pietermaritzburg', province: 'KwaZulu-Natal', latitude: -29.6006, longitude: 30.3794 },
  { name: 'Rustenburg', province: 'North West', latitude: -25.6672, longitude: 27.2424 },
  { name: 'George', province: 'Western Cape', latitude: -33.9628, longitude: 22.4619 },
  { name: 'Stellenbosch', province: 'Western Cape', latitude: -33.9321, longitude: 18.8602 },
  { name: 'Mthatha', province: 'Eastern Cape', latitude: -31.5889, longitude: 28.7844 },
  { name: 'Welkom', province: 'Free State', latitude: -27.9769, longitude: 26.7336 },
  { name: 'Vereeniging', province: 'Gauteng', latitude: -26.6731, longitude: 27.9319 },
  { name: 'Witbank', province: 'Mpumalanga', latitude: -25.8749, longitude: 29.234 },
  { name: 'Klerksdorp', province: 'North West', latitude: -26.8523, longitude: 26.6663 },
  { name: 'Upington', province: 'Northern Cape', latitude: -28.4478, longitude: 21.2561 },
  { name: 'Paarl', province: 'Western Cape', latitude: -33.7342, longitude: 18.9621 },
  { name: 'Worcester', province: 'Western Cape', latitude: -33.6464, longitude: 19.4486 },
  { name: 'Newcastle', province: 'KwaZulu-Natal', latitude: -27.7574, longitude: 29.9316 },
  { name: 'Richards Bay', province: 'KwaZulu-Natal', latitude: -28.783, longitude: 32.0377 },
  { name: 'Potchefstroom', province: 'North West', latitude: -26.7145, longitude: 27.098 },
  { name: 'Middelburg', province: 'Mpumalanga', latitude: -25.7754, longitude: 29.4644 },
  { name: 'Knysna', province: 'Western Cape', latitude: -34.0363, longitude: 23.0471 },
  { name: 'Grahamstown', province: 'Eastern Cape', latitude: -33.3054, longitude: 26.5327 },
  { name: 'Midrand', province: 'Gauteng', latitude: -25.9895, longitude: 28.1264 },
  { name: 'Centurion', province: 'Gauteng', latitude: -25.8603, longitude: 28.1894 },
] as const

const directoryByName = new Map(
  southAfricaCityDirectory.map((entry) => [entry.name.trim().toLowerCase(), entry]),
)

export function findCityDirectoryEntry(cityName: string): SouthAfricaCityDirectoryEntry | null {
  return directoryByName.get(cityName.trim().toLowerCase()) ?? null
}
