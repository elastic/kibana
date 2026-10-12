/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { estypes } from '@elastic/elasticsearch';
import { euid } from '@kbn/entity-store/common/euid_helpers';
import { DEFAULT_ALERTS_INDEX } from '../../../../../common/constants';
import type { BriefTimeRange } from '../../../../../common/entity_analytics/executive_brief/types';
import { nameFromEuid, typeFromEuid } from './entity_docs';

export const ENTITY_USER_FIELD = 'entity_user';
export const ENTITY_HOST_FIELD = 'entity_host';

export const getAlertsIndex = (spaceId: string): string => `${DEFAULT_ALERTS_INDEX}-${spaceId}`;

export const buildEntityRuntimeMappings = (): Record<string, estypes.MappingRuntimeField> => ({
  [ENTITY_USER_FIELD]: euid.painless.getEuidRuntimeMapping('user'),
  [ENTITY_HOST_FIELD]: euid.painless.getEuidRuntimeMapping('host'),
});

export interface AlertEntityRefs {
  /** Every euid (golden and aliases) the alerts may be stamped or derived with. */
  euids: string[];
  hostNames: string[];
  /** `host.id` values: the euid body of host entities (`host:<host.id>`). */
  hostIds: string[];
  userNames: string[];
}

const unique = (values: string[]): string[] => [...new Set(values)].sort();

/** Builds the cheap query-level prefilter, so Painless EUIDs only run on candidate alerts. */
export const buildEntityRefs = (
  entities: Array<{ euid: string; name?: string }>
): AlertEntityRefs => {
  const hostNames: string[] = [];
  const hostIds: string[] = [];
  const userNames: string[] = [];
  for (const entity of entities) {
    const type = typeFromEuid(entity.euid);
    const names = [entity.name ?? nameFromEuid(entity.euid), nameFromEuid(entity.euid)];
    if (type === 'host') {
      hostNames.push(...names);
      hostIds.push(entity.euid.slice(entity.euid.indexOf(':') + 1));
    }
    if (type === 'user') userNames.push(...names);
  }
  return {
    euids: unique(entities.map((entity) => entity.euid)),
    hostNames: unique(hostNames),
    hostIds: unique(hostIds),
    userNames: unique(userNames),
  };
};

export const buildEntityPrefilter = (refs: AlertEntityRefs): estypes.QueryDslQueryContainer => ({
  bool: {
    should: [
      { terms: { 'kibana.alert.entity.id': refs.euids } },
      { terms: { 'host.name': refs.hostNames } },
      { terms: { 'host.id': refs.hostIds } },
      { terms: { 'user.name': refs.userNames } },
    ],
    minimum_should_match: 1,
  },
});

/** Window + non-building-block + entity prefilter. */
export const buildAlertScopeFilter = (
  timeRange: BriefTimeRange,
  refs: AlertEntityRefs
): estypes.QueryDslQueryContainer => ({
  bool: {
    filter: [
      { range: { '@timestamp': { gte: timeRange.from, lte: timeRange.to } } },
      buildEntityPrefilter(refs),
    ],
    must_not: [{ exists: { field: 'kibana.alert.building_block_type' } }],
  },
});

/** Runtime-field membership test for a set of golden + alias euids. */
export const buildEntityMembershipQuery = (euids: string[]): estypes.QueryDslQueryContainer => ({
  bool: {
    should: [{ terms: { [ENTITY_USER_FIELD]: euids } }, { terms: { [ENTITY_HOST_FIELD]: euids } }],
    minimum_should_match: 1,
  },
});

export const asBucketArray = <T extends { key: unknown }>(aggregate: unknown): T[] => {
  const buckets =
    typeof aggregate === 'object' && aggregate !== null
      ? (aggregate as { buckets?: unknown }).buckets
      : undefined;
  return Array.isArray(buckets) ? (buckets as T[]) : [];
};
