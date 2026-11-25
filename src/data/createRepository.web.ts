import { InMemoryRepository } from './inMemoryRepository';
import type { AppRepository } from './repository';

export function createRepository(): AppRepository {
  return new InMemoryRepository({ allowSyntheticInDev: true });
}
