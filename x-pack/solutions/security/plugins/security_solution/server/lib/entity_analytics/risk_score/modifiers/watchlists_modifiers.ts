/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { Logger } from '@kbn/core/server';
import get from 'lodash/get';
import type { WatchlistObject } from '../../../../../common/api/entity_analytics/watchlists/management/common.gen';
import type { ExperimentalFeatures } from '../../../../../common';
import type { RiskScoreBucket } from '../../types';
import type { WatchlistConfigClient } from '../../watchlists/management/watchlist_config';
import type { Modifier } from './types';
import type { WatchlistEntitiesService } from '../../watchlists/entities/service';

interface WatchlistModifierParams {
  page: {
    buckets: RiskScoreBucket[];
    identifierField: string;
    bounds: {
      lower?: string;
      upper?: string;
    };
  };

  deps: {
    watchlistConfigClient: WatchlistConfigClient;
    watchlistEntityService: WatchlistEntitiesService;
    logger: Logger;
  };
  experimentalFeatures: ExperimentalFeatures;
  globalWeight?: number;
}

export const applyWatchlistModifiers = async ({
  page: { buckets, identifierField, bounds },
  deps,
  globalWeight,
  experimentalFeatures,
}: WatchlistModifierParams) => {
  if (buckets.length === 0) {
    return [];
  }

  if (!experimentalFeatures.entityAnalyticsWatchlistEnabled) {
    return [];
  }
  const lower = bounds?.lower ? `${identifierField} > ${bounds.lower}` : undefined;
  const upper = bounds?.upper ? `${identifierField} <= ${bounds.upper}` : undefined;
  if (!lower && !upper) {
    throw new Error('Either lower or upper after key must be provided for pagination');
  }
  const rangeClauseKQL =
    !lower && !upper ? undefined : [lower, upper].filter(Boolean).join(' and ');

  const entitiesPerWatchlist = await deps.watchlistConfigClient.list().then((watchlists) =>
    watchlists.map(async (w) => {
      const entities = await deps.watchlistEntityService.list(w, rangeClauseKQL);
      return buckets.map((bucket) => {
        const isInWatchlist = entities.some(
          (entity) => get(entity, identifierField) === bucket.key[identifierField]
        );
        return buildModifier(isInWatchlist, w, globalWeight);
      });
    })
  );

  return entitiesPerWatchlist;
};

const buildModifier = (
  isInWatchlist: boolean,
  watchlist: WatchlistObject,
  globalWeight?: number
): Modifier<'watchlist'> | undefined => {
  if (!isInWatchlist) {
    return;
  }

  const weightedModifier =
    globalWeight !== undefined ? watchlist.riskModifier * globalWeight : watchlist.riskModifier;

  return {
    type: 'watchlist',
    subtype: watchlist.name === 'privileged_users' ? 'privmon' : watchlist.name,
    modifier_value: weightedModifier,
    metadata:
      watchlist.name === 'privileged_users'
        ? {
            is_privileged_user: true,
          }
        : { inWatchlist: true },
  };
};
