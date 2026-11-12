import * as migration_20261110_150344_initial from './20261110_150344_initial';
import * as migration_20261111_065650_sport_categories from './20261111_065650_sport_categories';
import * as migration_20261111_203059_story_header_images from './20261111_203059_story_header_images';
import * as migration_20261112_075459_discover_image_size from './20261112_075459_discover_image_size';

export const migrations = [
  {
    up: migration_20261110_150344_initial.up,
    down: migration_20261110_150344_initial.down,
    name: '20261110_150344_initial',
  },
  {
    up: migration_20261111_065650_sport_categories.up,
    down: migration_20261111_065650_sport_categories.down,
    name: '20261111_065650_sport_categories',
  },
  {
    up: migration_20261111_203059_story_header_images.up,
    down: migration_20261111_203059_story_header_images.down,
    name: '20261111_203059_story_header_images',
  },
  {
    up: migration_20261112_075459_discover_image_size.up,
    down: migration_20261112_075459_discover_image_size.down,
    name: '20261112_075459_discover_image_size'
  },
];
