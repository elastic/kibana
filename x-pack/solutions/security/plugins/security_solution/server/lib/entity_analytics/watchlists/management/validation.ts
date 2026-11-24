/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { SavedObjectsClientContract } from '@kbn/core/server';
import { nodeBuilder } from '@kbn/es-query';
import { canUpdateWatchlistField } from '../../../../../common/api/entity_analytics/watchlists/management';
import type { WatchlistObject } from '../../../../../common/api/entity_analytics/watchlists/management/common.gen';
import { RESERVED_WATCHLIST_NAMES } from '../../../../../common/entity_analytics/watchlists/constants';
import { watchlistConfigTypeName } from './saved_object/watchlist_config_type';
import { createWatchlistValidationError } from './watchlist_config';

/**
 * Throws a 409 when `name` is reserved for a system watchlist or when another watchlist in the
 * current space already uses it. The comparison is an exact, case-sensitive match on the trimmed
 * name. Pass `excludeId` to ignore the watchlist being renamed.
 */
export const assertWatchlistNameIsAvailable = async (
  soClient: SavedObjectsClientContract,
  name: string,
  excludeId?: string
): Promise<void> => {
  const trimmed = name.trim();

  if (RESERVED_WATCHLIST_NAMES.includes(trimmed)) {
    throw createWatchlistValidationError(
      409,
      i18n.translate('xpack.securitySolution.entityAnalytics.watchlists.api.nameReserved', {
        defaultMessage: '"{name}" is reserved for a system watchlist',
        values: { name: trimmed },
      })
    );
  }

  const response = await soClient.find<{ name: string }>({
    type: watchlistConfigTypeName,
    filter: nodeBuilder.is(`${watchlistConfigTypeName}.attributes.name`, trimmed),
    perPage: 2,
    fields: ['name'],
  });

  const isTaken = response.saved_objects.some((so) => so.id !== excludeId);
  if (isTaken) {
    throw createWatchlistValidationError(
      409,
      i18n.translate('xpack.securitySolution.entityAnalytics.watchlists.api.nameAlreadyExists', {
        defaultMessage: 'A watchlist named "{name}" already exists',
        values: { name: trimmed },
      })
    );
  }
};

/**
 * Validates whether the requested updates to a watchlist are permitted: a managed watchlist cannot
 * change its locked fields, and a new name must be available in the space.
 *
 * @param soClient - Used to check whether the new name is already taken
 * @param id - The ID of the watchlist being updated
 * @param attrs - The new attributes being requested for the update
 * @param existing - The current state of the watchlist before the update
 *
 * @throws {WatchlistValidationError} 400 if a locked field of a managed watchlist is changed, 409
 * if the new name is reserved or already used by another watchlist
 */
export const validateWatchlistUpdate = async ({
  soClient,
  id,
  attrs,
  existing,
}: {
  soClient: SavedObjectsClientContract;
  id: string;
  attrs: Partial<WatchlistObject>;
  existing: WatchlistObject;
}): Promise<void> => {
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

  // Only a changed name is checked, so watchlists that already share a name stay editable
  if (attrs.name !== undefined && attrs.name !== existing.name) {
    await assertWatchlistNameIsAvailable(soClient, attrs.name, id);
  }
};
