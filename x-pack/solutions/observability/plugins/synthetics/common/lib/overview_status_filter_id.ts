/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { OverviewStatusFilterId, OverviewStatusMetaData } from '../runtime_types';
import { isSingleLocationExternalOverviewRow } from './overview_config_key';

export interface OverviewStatusFilterIdGroup {
  remoteName?: string;
  locationId?: string;
  queryIds: string[];
  linkedRemoteLocations?: OverviewStatusFilterId['linkedRemoteLocations'];
}

export const mergeLinkedRemoteLocations = (
  left?: OverviewStatusFilterId['linkedRemoteLocations'],
  right?: OverviewStatusFilterId['linkedRemoteLocations']
): OverviewStatusFilterId['linkedRemoteLocations'] => {
  if (!left?.length && !right?.length) {
    return undefined;
  }
  const merged = [...(left ?? [])];
  for (const location of right ?? []) {
    if (
      !merged.some(
        (existing) =>
          existing.remoteName === location.remoteName && existing.locationId === location.locationId
      )
    ) {
      merged.push(location);
    }
  }
  return merged;
};

/**
 * Chart/alerts filter identity for one overview row. External (CCS / Heartbeat)
 * rows are one location each, so `remoteName` + `locationId` must travel with
 * `monitorQueryId` — a bare id cannot tell two copies of the same monitor
 * apart. Local saved-object rows stay `{ monitorQueryId }` (locations grouped,
 * overall DOWN if any location is down).
 */
export const toOverviewStatusFilterId = (
  config: Pick<
    OverviewStatusMetaData,
    'monitorQueryId' | 'origin' | 'remote' | 'locations' | 'linkedRemoteLocations'
  >
): OverviewStatusFilterId => {
  const locationId = config.locations[0]?.id;
  if (!locationId || !isSingleLocationExternalOverviewRow(config)) {
    return {
      monitorQueryId: config.monitorQueryId,
      ...(config.linkedRemoteLocations?.length
        ? { linkedRemoteLocations: config.linkedRemoteLocations }
        : {}),
    };
  }
  return {
    monitorQueryId: config.monitorQueryId,
    ...(config.remote?.remoteName ? { remoteName: config.remote.remoteName } : {}),
    locationId,
  };
};

export const overviewStatusFilterIdKey = ({
  monitorQueryId,
  remoteName,
  locationId,
}: OverviewStatusFilterId): string => `${remoteName ?? ''}\0${monitorQueryId}\0${locationId ?? ''}`;

export const groupOverviewStatusFilterIds = (
  ids: OverviewStatusFilterId[]
): OverviewStatusFilterIdGroup[] => {
  const groups = new Map<string, OverviewStatusFilterIdGroup>();
  for (const { monitorQueryId, remoteName, locationId, linkedRemoteLocations } of ids) {
    const key = `${remoteName ?? ''}\0${locationId ?? ''}`;
    const existing = groups.get(key);
    if (existing) {
      existing.queryIds.push(monitorQueryId);
      const merged = mergeLinkedRemoteLocations(
        existing.linkedRemoteLocations,
        linkedRemoteLocations
      );
      if (merged) {
        existing.linkedRemoteLocations = merged;
      }
    } else {
      groups.set(key, {
        ...(remoteName ? { remoteName } : {}),
        ...(locationId ? { locationId } : {}),
        ...(linkedRemoteLocations?.length ? { linkedRemoteLocations } : {}),
        queryIds: [monitorQueryId],
      });
    }
  }
  return [...groups.values()];
};
