/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isEqual } from 'lodash';
import type { KibanaRequest, Logger, SavedObjectsClientContract } from '@kbn/core/server';
import { i18n } from '@kbn/i18n';
import type {
  DateRange,
  MonitoringEntitySource,
  MonitoringEntitySourceAttributes,
} from '../../../../../common/api/entity_analytics/watchlists/data_source/common.gen';
import type { WatchlistObject } from '../../../../../common/api/entity_analytics/watchlists/management/common.gen';
import type { RuleBasedSourceType, WatchlistEntitySourceClient } from '../entity_sources/infra';
import { validateWatchlistUpdate } from './validation';
import type { WatchlistConfigClient } from './watchlist_config';
import { createWatchlistValidationError } from './watchlist_config';

export interface RuleBasedSourceInput {
  type: RuleBasedSourceType;
  name: string;
  indexPattern?: string;
  identifierField?: string;
  queryRule?: string;
  enabled?: boolean;
  range?: DateRange;
}

interface WatchlistFieldsInput {
  name: string;
  description?: string;
  riskModifier: number;
  managed?: boolean;
}

export interface UpdateWatchlistWithSourcesParams {
  soClient: SavedObjectsClientContract;
  watchlistClient: WatchlistConfigClient;
  sourceClient: WatchlistEntitySourceClient;
  request: KibanaRequest;
  logger: Logger;
  watchlistId: string;
  watchlist: WatchlistFieldsInput;
  /**
   * `undefined` leaves them as they are, an empty array removes them all. Integration and managed sources are never touched.
   */
  entitySources?: RuleBasedSourceInput[];
}

/**
 * Saves a watchlist together with its rule-based entity sources in one server-side operation.
 *
 * 1. Validates everything that can be validated before anything is written: the watchlist name,
 *    the sources (query, index access, encryption, unique names).
 * 2. Creates the new sources and updates the watchlist. If that fails, the sources just created
 *    are removed again, so the watchlist is left as it was.
 * 3. Updates the sources that already exist, then removes the ones that are no longer wanted.
 *    Removals come last because they cannot be undone, so a failure earlier never loses a source
 *    the user still had.
 */
export const updateWatchlistWithSources = async ({
  soClient,
  watchlistClient,
  sourceClient,
  request,
  logger,
  watchlistId,
  watchlist,
  entitySources,
}: UpdateWatchlistWithSourcesParams): Promise<{
  watchlist: WatchlistObject;
  shouldSync: boolean;
}> => {
  // 1. Validate
  const existing = await watchlistClient.get(watchlistId);
  await validateWatchlistUpdate({
    soClient,
    id: watchlistId,
    attrs: watchlist,
    existing,
  });

  // 2. If no sources update, update the watchlist and return
  if (entitySources === undefined) {
    return {
      watchlist: await watchlistClient.update(watchlistId, watchlist),
      shouldSync: false,
    };
  }

  // A watchlist that is not managed has one rule-based source, as the watchlist form allows. A
  // managed one can have a store and an index source next to its integration sources.
  const isManaged = watchlist.managed ?? existing.managed === true;
  if (!isManaged && entitySources.length > 1) {
    throw createWatchlistValidationError(
      400,
      i18n.translate('xpack.securitySolution.entityAnalytics.watchlists.api.singleSourceOnly', {
        defaultMessage: 'A watchlist that is not managed can have only one rule-based data source',
      })
    );
  }

  // 3. Get the current sources and validate them
  const sourceIds = await watchlistClient.getEntitySourceIds(watchlistId);
  const { sources: referencedSources } = await sourceClient.list(
    { per_page: Math.max(sourceIds.length, 1) },
    sourceIds
  );
  const currentSources = referencedSources.filter(isRuleBasedSource);

  // only one source per type is allowed
  const currentByType = new Map<RuleBasedSourceType, MonitoringEntitySource>();
  for (const source of currentSources) {
    if (source.type && !currentByType.has(source.type)) {
      currentByType.set(source.type, source);
    }
  }

  const sourcesToUpdate: Array<{ current: MonitoringEntitySource; input: RuleBasedSourceInput }> =
    [];
  const sourcesToCreate: RuleBasedSourceInput[] = [];
  for (const input of entitySources) {
    const current = currentByType.get(input.type);
    if (current) {
      sourcesToUpdate.push({ current, input });
    } else {
      sourcesToCreate.push(input);
    }
  }
  const keptIds = new Set(sourcesToUpdate.map(({ current }) => current.id));
  const sourcesToRemove = currentSources.filter((source) => !keptIds.has(source.id));

  await validateSources({ sourceClient, inputs: entitySources, sourceIdByType: currentByType });

  // 4. Create the new sources and update the watchlist; undo the creations if either fails
  const createdSources: MonitoringEntitySource[] = [];
  let updatedWatchlist: WatchlistObject;
  try {
    for (const input of sourcesToCreate) {
      const created = await sourceClient.create(toSourceAttributes(input), request);
      createdSources.push(created);
      await watchlistClient.addEntitySourceReference(watchlistId, created.id);
    }
    updatedWatchlist = await watchlistClient.update(watchlistId, watchlist);
  } catch (error) {
    await removeSources({ watchlistClient, sourceClient, logger, watchlistId, createdSources });
    throw error;
  }

  // 5. Update the sources that stay, then remove the ones that are gone
  for (const { current, input } of sourcesToUpdate) {
    await sourceClient.update({ id: current.id, ...toSourceAttributes(input) }, request);
  }
  for (const source of sourcesToRemove) {
    await sourceClient.delete(source.id);
    try {
      await watchlistClient.removeEntitySourceReference(watchlistId, source);
    } catch (error) {
      logger.warn(
        `Removed entity source '${
          source.id
        }' but could not unlink it from watchlist '${watchlistId}': ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }

  // The watchlist was read before the old sources were removed, so take them out of its source ids
  const removedIds = new Set(sourcesToRemove.map(({ id }) => id));
  return {
    watchlist: {
      ...updatedWatchlist,
      entitySourceIds: updatedWatchlist.entitySourceIds?.filter((id) => !removedIds.has(id)),
    },
    shouldSync:
      sourcesToCreate.length > 0 ||
      sourcesToRemove.length > 0 ||
      sourcesToUpdate.some(({ current, input }) => changesWhatSourceMatches(current, input)),
  };
};

// Utility functions

const isRuleBasedSource = (
  source: MonitoringEntitySource
): source is MonitoringEntitySource & { type: RuleBasedSourceType } =>
  (source.type === 'index' || source.type === 'store') && source.managed !== true;

const toSourceAttributes = (input: RuleBasedSourceInput): MonitoringEntitySourceAttributes => ({
  type: input.type,
  name: input.name,
  indexPattern: input.indexPattern,
  identifierField: input.identifierField,
  queryRule: input.queryRule,
  enabled: input.enabled,
  ...(input.type === 'index' ? { range: input.range } : {}),
});

const FIELDS_THAT_CHANGE_MEMBERSHIP = [
  'indexPattern',
  'identifierField',
  'queryRule',
  'enabled',
  'range',
] as const;
const changesWhatSourceMatches = (
  current: MonitoringEntitySource,
  input: RuleBasedSourceInput
): boolean => {
  const next = toSourceAttributes(input);
  return FIELDS_THAT_CHANGE_MEMBERSHIP.some(
    (field) => next[field] !== undefined && !isEqual(next[field], current[field])
  );
};

const validateSources = async ({
  sourceClient,
  inputs,
  sourceIdByType,
}: {
  sourceClient: WatchlistEntitySourceClient;
  inputs: RuleBasedSourceInput[];
  sourceIdByType: Map<RuleBasedSourceType, MonitoringEntitySource>;
}): Promise<void> => {
  const seenTypes = new Set<RuleBasedSourceType>();

  for (const input of inputs) {
    if (seenTypes.has(input.type)) {
      throw createWatchlistValidationError(
        400,
        i18n.translate(
          'xpack.securitySolution.entityAnalytics.watchlists.api.duplicateSourceType',
          {
            defaultMessage: 'A watchlist can have only one {type} data source',
            values: { type: input.type },
          }
        )
      );
    }
    seenTypes.add(input.type);

    await sourceClient.validate({
      ...toSourceAttributes(input),
      id: sourceIdByType.get(input.type)?.id,
    });
  }
};

const removeSources = async ({
  watchlistClient,
  sourceClient,
  logger,
  watchlistId,
  createdSources,
}: {
  watchlistClient: WatchlistConfigClient;
  sourceClient: WatchlistEntitySourceClient;
  logger: Logger;
  watchlistId: string;
  createdSources: MonitoringEntitySource[];
}): Promise<void> => {
  for (const source of createdSources) {
    let isDeleted = false;
    try {
      await sourceClient.delete(source.id);
      isDeleted = true;
    } catch (error) {
      logger.warn(
        `Failed to remove entity source '${
          source.id
        }' after a failed save of watchlist '${watchlistId}': ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }

    if (isDeleted) {
      try {
        await watchlistClient.removeEntitySourceReference(watchlistId, source);
      } catch {
        // The source was never linked, or the link is already gone; a link to a deleted source is harmless
      }
    }
  }
};
