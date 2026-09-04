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

/** Group-by grids have no page control; they need the full result set. */
export function isOverviewGrouped(groupField?: string): boolean {
  return Boolean(groupField) && groupField !== 'none' && groupField !== 'monitor';
}

/** Page-1 fetch for a grouped view, clamped to the route max. Remainder pages fill after. */
export function getGroupedFillPageState<T extends { page?: number; perPage?: number }>(
  pageState: T
): T {
  return { ...pageState, page: 1, perPage: OVERVIEW_STATUS_MAX_PER_PAGE };
}

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
 * Next infinite-scroll page for the ungrouped card view, or `null` when there
 * is nothing more to fetch. Uses `ceil(loaded / perPage) + 1` so a silent
 * refresh that drops a monitor (loaded is no longer a multiple of `perPage`)
 * still advances instead of stalling.
 */
export function getNextOverviewAppendPage(
  loadedMonitors: number,
  perPage: number,
  total: number
): number | null {
  if (perPage <= 0 || loadedMonitors <= 0 || loadedMonitors >= total) {
    return null;
  }
  const nextPage = Math.ceil(loadedMonitors / perPage) + 1;
  if ((nextPage - 1) * perPage >= total) {
    return null;
  }
  return nextPage;
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
