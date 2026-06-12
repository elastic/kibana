/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { WatchlistObject } from './common.gen';

export const MANAGED_WATCHLIST_LOCKED_FIELDS = ['name', 'description'] as const;

/**
 * Checks if a field in a particular watchlist can be edited/updated.
 *
 * @param fieldName - The field to check if it can be edited
 * @param isManaged - Indicates if the watchlist is managed by the system
 * @returns True if the field is allowed to be edited, false otherwise
 */
export const canUpdateWatchlistField = (
  fieldName: keyof WatchlistObject | string,
  isManaged: boolean
): boolean => {
  // If we are updating an existing managed watchlist, some fields are locked
  if (isManaged) {
    return !(MANAGED_WATCHLIST_LOCKED_FIELDS as readonly string[]).includes(fieldName);
  }
  // Otherwise, all fields are editable
  return true;
};
