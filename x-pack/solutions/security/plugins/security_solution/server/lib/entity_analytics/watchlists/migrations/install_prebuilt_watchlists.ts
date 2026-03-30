/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { asyncForEach } from '@kbn/std';
import { first } from 'lodash/fp';
import type { EntityAnalyticsMigrationsParams } from '../../migrations';
import { riskEngineConfigurationTypeName } from '../../risk_engine/saved_object';
import { buildScopedInternalSavedObjectsClientUnsafe } from '../../risk_score/tasks/helpers';
import { PRIVILEGED_USER_MODIFIER } from '../../risk_score/modifiers/privileged_users';
import { WatchlistConfigClient } from '../management/watchlist_config';

// Bump this when PREBUILT_WATCHLISTS definitions change
const PREBUILT_WATCHLISTS_VERSION = 1;

const PREBUILT_WATCHLISTS = [
  {
    id: 'privileged-user-monitoring-watchlist-id',
    name: 'Privileged Users',
    description: 'System-managed watchlist for tracking privileged users',
    managed: true,
    riskModifier: PRIVILEGED_USER_MODIFIER,
  },
];

export const installPrebuiltWatchlists = async ({
  logger,
  getStartServices,
}: EntityAnalyticsMigrationsParams) => {
  const [coreStart] = await getStartServices();
  const soClientInternal = coreStart.savedObjects.createInternalRepository();

  const savedObjectsResponse = await soClientInternal.find({
    type: riskEngineConfigurationTypeName,
    perPage: 100,
    namespaces: ['*'],
  });

  if (savedObjectsResponse.total === 0) {
    logger.debug('No risk engine configurations found. Skipping prebuilt watchlist installation.');
    return;
  }

  const esClient = coreStart.elasticsearch.client.asInternalUser;

  await asyncForEach(savedObjectsResponse.saved_objects, async (savedObject) => {
    const namespace = first(savedObject.namespaces);

    if (!namespace) {
      logger.error(
        'Unexpected saved object. Risk engine configuration saved objects must have a namespace'
      );
      return;
    }

    const soClient = buildScopedInternalSavedObjectsClientUnsafe({ coreStart, namespace });
    const watchlistClient = new WatchlistConfigClient({
      soClient,
      esClient,
      namespace,
      logger,
    });

    for (const watchlist of PREBUILT_WATCHLISTS) {
      try {
        await watchlistClient.get(watchlist.id);
      } catch (e) {
        const errorMessage = e instanceof Error ? e.message : String(e);
        if (errorMessage.includes('not found')) {
          logger.info(
            `Prebuilt watchlist '${watchlist.name}' not found in namespace "${namespace}", initializing...`
          );
          const { id, ...attrs } = watchlist;
          await watchlistClient.create(attrs, { id });
          logger.info(
            `Prebuilt watchlist '${watchlist.name}' initialized in namespace "${namespace}".`
          );
        } else {
          logger.error(
            `Error checking prebuilt watchlist '${watchlist.name}' in namespace "${namespace}": ${errorMessage}`
          );
        }
      }
    }
  });
};
