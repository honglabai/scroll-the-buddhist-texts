import type { AppRepository } from './repository';
import { SqliteRepository } from './sqliteRepository';

export function createRepository(): AppRepository {
  return new SqliteRepository({ allowSyntheticInDev: true });
}
