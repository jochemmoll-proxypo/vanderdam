import * as migration_20261110_150344_initial from './20261110_150344_initial';

export const migrations = [
  {
    up: migration_20261110_150344_initial.up,
    down: migration_20261110_150344_initial.down,
    name: '20261110_150344_initial'
  },
];
