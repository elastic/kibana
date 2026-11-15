/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HuntLibraryListItem } from '../../../common/hunt_library';

export type AvailabilityFilter = 'all' | 'available' | 'unavailable';

export interface HuntFilters {
  search: string;
  platform: string;
  availability: AvailabilityFilter;
}

export const ALL_PLATFORMS = 'all';

export const DEFAULT_FILTERS: HuntFilters = {
  search: '',
  platform: ALL_PLATFORMS,
  availability: 'all',
};

export const isFiltering = ({ search, platform, availability }: HuntFilters): boolean =>
  search.trim() !== '' || platform !== ALL_PLATFORMS || availability !== 'all';

/** Client-side filtering: the catalog is a small fixed set, so the server returns all of it. */
export const filterHunts = (
  hunts: readonly HuntLibraryListItem[],
  { search, platform, availability }: HuntFilters
): HuntLibraryListItem[] => {
  const needle = search.trim().toLowerCase();
  return hunts.filter((hunt) => {
    if (platform !== ALL_PLATFORMS && !hunt.platform.includes(platform)) return false;
    if (availability === 'available' && !hunt.availability.available) return false;
    if (availability === 'unavailable' && hunt.availability.available) return false;
    if (needle === '') return true;
    return [hunt.name, hunt.description, ...hunt.mitreTechniques].some((text) =>
      text.toLowerCase().includes(needle)
    );
  });
};

export const platformsOf = (hunts: readonly HuntLibraryListItem[]): string[] =>
  [...new Set(hunts.flatMap(({ platform }) => platform))].sort();
