/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { canUpdateWatchlistField } from '../../../../../common/api/entity_analytics/watchlists/management';
import type { WatchlistObject } from '../../../../../common/api/entity_analytics/watchlists/management/common.gen';
import { createWatchlistValidationError } from './watchlist_config';

/**
 * Validates whether the requested updates to a watchlist are permitted based on its current state.
 *
 * @param id - The ID of the watchlist being updated
 * @param attrs - The new attributes being requested for the update
 * @param existing - The current state of the watchlist before the update
 *
 * @throws {WatchlistValidationError} If an update is requested on a locked field for a managed watchlist
 */
export const validateWatchlistUpdate = (
  id: string,
  attrs: Partial<WatchlistObject>,
  existing: WatchlistObject
): void => {
  const isManaged = existing.managed === true;

  const invalidFields = Object.keys(attrs).filter((key) => {
    const field = key as keyof WatchlistObject;
    return (
      attrs[field] !== undefined &&
      // Only fail if the locked field's value actually changed (ignores unmodified fields sent in the payload)
      attrs[field] !== existing[field] &&
      !canUpdateWatchlistField(field, isManaged)
    );
  });

  if (invalidFields.length > 0) {
    throw createWatchlistValidationError(
      400,
      `Cannot modify ${invalidFields.join(' and ')} of managed watchlist '${id}'`
    );
  }
};
