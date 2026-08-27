/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Default values the server's mock watch store is seeded from on first access.
 *
 * Identity comes from `createCatalogWatchPlaceholder`. Mock UX still needs `enabled: true` so the
 * settings switch is on without an install. Runtime fiction that the UI no longer shows (runs,
 * callables, coverage, lastRun) stays empty — same as a live not-installed row.
 *
 * These are defaults only — the store owns runtime state, so nothing outside the store should read
 * this array. Toggling a watch off mutates the store, not these constants.
 */

import {
  SYSTEM_SECURITY_WATCH_DARK_ID,
  SYSTEM_SECURITY_WATCH_DEEP_ID,
  SYSTEM_SECURITY_WATCH_DETECTION_ID,
  SYSTEM_SECURITY_WATCH_FLOOR_ID,
  SYSTEM_SECURITY_WATCH_OFFICER_ID,
} from '../../constants';
import { createCatalogWatchPlaceholder, type CatalogWatchId } from '../watches/watch_helpers';
import type { Watch } from '../schemas/components/watch.gen';

const mockCatalogWatch = (watchId: CatalogWatchId): Watch => ({
  ...createCatalogWatchPlaceholder(watchId),
  enabled: true,
});

export const WATCHES_SEED: Watch[] = [
  mockCatalogWatch(SYSTEM_SECURITY_WATCH_FLOOR_ID),
  mockCatalogWatch(SYSTEM_SECURITY_WATCH_OFFICER_ID),
  mockCatalogWatch(SYSTEM_SECURITY_WATCH_DARK_ID),
  mockCatalogWatch(SYSTEM_SECURITY_WATCH_DEEP_ID),
  mockCatalogWatch(SYSTEM_SECURITY_WATCH_DETECTION_ID),
];
