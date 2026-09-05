import { southAfricaCityDirectory } from './southAfricaCityDirectory'

// Autocomplete suggestions for the community signup city field. This list is
// intentionally not exhaustive and never restricts input — any typed value is
// accepted, including cities outside South Africa.
export const southAfricaCities: readonly string[] = southAfricaCityDirectory.map((entry) => entry.name)
