/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Subject } from 'rxjs';
import type { EntityOrEventItem } from './components/grouped_item/types';

/**
 * Event bus used to notify external consumers (e.g. Security Solution plugin)
 * that a grouped item title has been clicked. This allows the graph package
 * to stay decoupled from flyout implementation details while still enabling
 * deep linking to single document/entity previews.
 */
export const groupedItemClick$ = new Subject<EntityOrEventItem>();

// Simple in-memory state for lightweight duplicate suppression
let lastEmittedId: string | undefined;
let lastEmittedTs = 0;
const DEDUPE_WINDOW_MS = 250; // ignore exact same id within window

/** Convenience publisher with naive duplicate suppression */
export const emitGroupedItemClick = (item: EntityOrEventItem) => {
  const now = Date.now();
  if (item.id === lastEmittedId && now - lastEmittedTs < DEDUPE_WINDOW_MS) {
    return; // drop duplicate rapid click
  }
  lastEmittedId = item.id;
  lastEmittedTs = now;
  groupedItemClick$.next(item);
};

/** Reset internal dedupe state (primarily for tests) */
export const __resetGroupedItemClickDedupe = () => {
  lastEmittedId = undefined;
  lastEmittedTs = 0;
};
