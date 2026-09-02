/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { OVERVIEW_STATUS_MAX_PER_PAGE } from '../../../../../common/constants/monitor_management';
import { getOverviewConfigKey } from '../../../../../common/lib';
import type {
  OverviewStatusMetaData,
  PaginatedOverviewStatus,
} from '../../../../../common/runtime_types';

/**
 * First request of a card-view window refresh. `perPage` is the loaded window
 * size, capped at the route max so a long infinite-scroll session cannot 400.
 */
export function getCardWindowRefreshPayload<T extends { page?: number; perPage?: number }>(
  pageState: T,
  loadedCount: number
): { pageState: T; refreshThrough?: number } {
  const perPage = Math.min(Math.max(loadedCount, 1), OVERVIEW_STATUS_MAX_PER_PAGE);
  return {
    pageState: { ...pageState, page: 1, perPage },
    ...(loadedCount > OVERVIEW_STATUS_MAX_PER_PAGE ? { refreshThrough: loadedCount } : {}),
  };
}

/**
 * Next page of a clamped window refresh, or `null` when `refreshThrough` is
 * already covered. Keeps `perPage` stable so offsets stay aligned with page 1.
 */
export function getNextWindowRefreshPage(
  incomingPage: number | undefined,
  incomingPerPage: number | undefined,
  refreshThrough: number
): { page: number; perPage: number } | null {
  const page = incomingPage ?? 1;
  const perPage = incomingPerPage ?? OVERVIEW_STATUS_MAX_PER_PAGE;
  if (page * perPage >= refreshThrough) {
    return null;
  }
  return { page: page + 1, perPage };
}

/**
 * Remainder pages of a window refresh must update already-loaded rows only.
 * A full last page would otherwise append monitors the user has not scrolled to.
 */
export function restrictOverviewPageToExistingKeys(
  existingConfigs: OverviewStatusMetaData[],
  incoming: PaginatedOverviewStatus
): PaginatedOverviewStatus {
  if (!incoming.configs) {
    return incoming;
  }
  const existingKeys = new Set(existingConfigs.map(getOverviewConfigKey));
  const configs = incoming.configs.filter((config) =>
    existingKeys.has(getOverviewConfigKey(config))
  );
  if (configs.length === incoming.configs.length) {
    return incoming;
  }
  const allowed = new Set(configs.map(getOverviewConfigKey));
  const filterBucket = (
    bucket: Record<string, OverviewStatusMetaData> | undefined
  ): Record<string, OverviewStatusMetaData> => {
    const next: Record<string, OverviewStatusMetaData> = {};
    for (const value of Object.values(bucket ?? {})) {
      const key = getOverviewConfigKey(value);
      if (allowed.has(key)) {
        next[key] = value;
      }
    }
    return next;
  };
  return {
    ...incoming,
    configs,
    upConfigs: filterBucket(incoming.upConfigs),
    downConfigs: filterBucket(incoming.downConfigs),
    pendingConfigs: filterBucket(incoming.pendingConfigs),
    staleConfigs: filterBucket(incoming.staleConfigs),
    disabledConfigs: filterBucket(incoming.disabledConfigs),
  };
}
