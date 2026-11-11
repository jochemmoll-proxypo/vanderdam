import * as migration_20261110_150344_initial from './20261110_150344_initial';
import * as migration_20261111_065650_sport_categories from './20261111_065650_sport_categories';

export const migrations = [
  {
    up: migration_20261110_150344_initial.up,
    down: migration_20261110_150344_initial.down,
    name: '20261110_150344_initial',
  },
  {
    up: migration_20261111_065650_sport_categories.up,
    down: migration_20261111_065650_sport_categories.down,
    name: '20261111_065650_sport_categories'
  },
];
