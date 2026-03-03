import { adjectives, animals, uniqueNamesGenerator } from 'unique-names-generator'

// Generates a random CamelCase name from adjective + animal pairs.
// Used as the default display name suggestion throughout the app.
export function generateRandomName(): string {
  return uniqueNamesGenerator({
    dictionaries: [adjectives, animals],
    style: 'capital',
    separator: '',
  })
}
