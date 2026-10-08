/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { get } from 'lodash';
import { ENTITY_LATEST, getEntitiesAlias } from '@kbn/entity-store/common';
import { ATTACK_DISCOVERY_SCHEDULES_ALERT_TYPE_ID } from '@kbn/elastic-assistant-common';
import type { AggregationsStringTermsBucketKeys } from '@elastic/elasticsearch/lib/api/types';
import type { SnapshotContext } from '../snapshot/context';
import { getLeadsIndexName } from '../../../../../common/entity_analytics/lead_generation/constants';
import {
  ACTIVE_WORKFLOW_STATUSES,
  MAX_ENTITY_DOCS,
  getAlertsIndex,
  getAttackDiscoveryIndices,
} from './constants';
import type {
  AttackDiscoveryStatus,
  EntityDocSummary,
  EntityDocsResult,
  LeadsStatus,
  RiskEngineStatus,
  UnattributedAlerts,
  UncasedAlerts,
  UnresolvedUsers,
} from './gap_signals';
import { RELATIONSHIP_SOURCES } from './gap_signals';

const RELATIONSHIP_KINDS = [
  'administers',
  'communicates_with',
  'depends_on',
  'owns_inferred',
  'accesses_infrequently',
  'accesses_frequently',
  'owns',
  'supervises',
] as const;

const RISK_SCORE_MAINTAINER_ID = 'risk-score';
const MAX_TERMS = 50;

const entityIndex = (ctx: SnapshotContext): string => getEntitiesAlias(ENTITY_LATEST, ctx.spaceId);

const totalOf = (total: number | { value: number } | undefined): number =>
  typeof total === 'number' ? total : total?.value ?? 0;

/** Reads a field that may be stored flat (`a.b.c`) or nested (`a: { b: { c } }`). */
const readField = (source: object, field: string): unknown =>
  Object.prototype.hasOwnProperty.call(source, field)
    ? Reflect.get(source, field)
    : get(source, field);

const asStringArray = (value: unknown): string[] => {
  if (Array.isArray(value)) return value.filter((v): v is string => typeof v === 'string');
  return typeof value === 'string' ? [value] : [];
};

const globToRegExp = (glob: string): RegExp =>
  new RegExp(`^${glob.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*')}$`);

// ---------------------------------------------------------------------------------------------
// Entity docs (B4, B6, B17)
// ---------------------------------------------------------------------------------------------

export const summarizeEntityDoc = (source: object): EntityDocSummary | undefined => {
  const [euid] = asStringArray(readField(source, 'entity.id'));
  if (!euid) return undefined;
  const [resolvedTo] = asStringArray(
    readField(source, 'entity.relationships.resolution.resolved_to')
  );
  const [criticality] = asStringArray(readField(source, 'asset.criticality'));
  const relationshipTargets = RELATIONSHIP_KINDS.flatMap((kind) =>
    asStringArray(readField(source, `entity.relationships.${kind}.ids`))
  );
  return {
    euid,
    hasRelationships: relationshipTargets.length > 0,
    ...(relationshipTargets.length > 0 ? { relationshipTargets } : {}),
    ...(resolvedTo ? { resolvedTo } : {}),
    ...(criticality ? { criticality } : {}),
  };
};

/** Golden entity docs plus the alias docs resolved to them, for the given golden euids. */
export const fetchEntityDocs = async (
  ctx: SnapshotContext,
  euids: readonly string[]
): Promise<EntityDocsResult> => {
  if (euids.length === 0) return { indexExists: true, docs: [] };
  const response = await ctx.esClient.search<object>(
    {
      index: entityIndex(ctx),
      size: MAX_ENTITY_DOCS,
      ignore_unavailable: true,
      allow_no_indices: true,
      _source: ['entity.id', 'entity.relationships', 'asset.criticality'],
      query: {
        bool: {
          should: [
            { terms: { 'entity.id': [...euids] } },
            { terms: { 'entity.relationships.resolution.resolved_to': [...euids] } },
            // Entities that point at the storyline entities (their outbound relationships).
            ...RELATIONSHIP_KINDS.map((kind) => ({
              terms: { [`entity.relationships.${kind}.ids`]: [...euids] },
            })),
          ],
          minimum_should_match: 1,
        },
      },
    },
    { signal: ctx.abortSignal }
  );
  const docs = response.hits.hits.flatMap((hit) => {
    const summary = hit._source ? summarizeEntityDoc(hit._source) : undefined;
    return summary ? [summary] : [];
  });
  return { indexExists: (response._shards?.total ?? 0) > 0, docs };
};

// ---------------------------------------------------------------------------------------------
// B1 relationship source inventory
// ---------------------------------------------------------------------------------------------

interface IndexBucketAggs {
  indices?: { buckets: AggregationsStringTermsBucketKeys[] };
}

/** Ids of relationship sources that have at least one backing index with documents. */
export const fetchRelationshipSourceInventory = async (
  ctx: SnapshotContext
): Promise<Set<string>> => {
  const response = await ctx.esClient.search<unknown, IndexBucketAggs>(
    {
      index: RELATIONSHIP_SOURCES.map(({ pattern }) => pattern),
      size: 0,
      ignore_unavailable: true,
      allow_no_indices: true,
      aggs: { indices: { terms: { field: '_index', size: 500 } } },
    },
    { signal: ctx.abortSignal }
  );
  // Data streams report their backing index (.ds-<name>-<date>-<generation>).
  const indexNames = (response.aggregations?.indices?.buckets ?? []).map(({ key }) =>
    String(key).replace(/^\.ds-/, '')
  );
  return new Set(
    RELATIONSHIP_SOURCES.filter(({ pattern }) => {
      const regexp = globToRegExp(pattern);
      return indexNames.some((name) => regexp.test(name));
    }).map(({ id }) => id)
  );
};

// ---------------------------------------------------------------------------------------------
// B5 unresolved local users
// ---------------------------------------------------------------------------------------------

interface UnresolvedAggs {
  in_storylines?: { ids?: { buckets: AggregationsStringTermsBucketKeys[] } };
}

export const fetchUnresolvedLocalUsers = async (
  ctx: SnapshotContext,
  storylineEuids: readonly string[]
): Promise<UnresolvedUsers> => {
  const response = await ctx.esClient.search<unknown, UnresolvedAggs>(
    {
      index: entityIndex(ctx),
      size: 0,
      track_total_hits: true,
      ignore_unavailable: true,
      allow_no_indices: true,
      query: {
        bool: {
          filter: [
            { term: { 'entity.EngineMetadata.Type': 'user' } },
            // Host-scoped local users: user:<name>@<host.id>@local
            { wildcard: { 'entity.id': { value: 'user:*@local' } } },
          ],
          must_not: [{ exists: { field: 'entity.relationships.resolution.resolved_to' } }],
        },
      },
      aggs: {
        in_storylines: {
          filter: { terms: { 'entity.id': [...storylineEuids] } },
          aggs: { ids: { terms: { field: 'entity.id', size: MAX_TERMS } } },
        },
      },
    },
    { signal: ctx.abortSignal }
  );
  return {
    total: totalOf(response.hits.total),
    storylineEuids: (response.aggregations?.in_storylines?.ids?.buckets ?? []).map(({ key }) =>
      String(key)
    ),
  };
};

// ---------------------------------------------------------------------------------------------
// B9 entity types present in the entity store
// ---------------------------------------------------------------------------------------------

interface TypeAggs {
  types?: { buckets: AggregationsStringTermsBucketKeys[] };
}

export const fetchEntityTypes = async (
  ctx: SnapshotContext
): Promise<{ indexExists: boolean; types: Set<string> }> => {
  const response = await ctx.esClient.search<unknown, TypeAggs>(
    {
      index: entityIndex(ctx),
      size: 0,
      ignore_unavailable: true,
      allow_no_indices: true,
      aggs: { types: { terms: { field: 'entity.EngineMetadata.Type', size: 10 } } },
    },
    { signal: ctx.abortSignal }
  );
  return {
    indexExists: (response._shards?.total ?? 0) > 0,
    types: new Set((response.aggregations?.types?.buckets ?? []).map(({ key }) => String(key))),
  };
};

// ---------------------------------------------------------------------------------------------
// B8 alerts without an entity
// ---------------------------------------------------------------------------------------------

/** Identity fields from which an entity id can be derived. */
const IDENTITY_FIELDS = [
  'kibana.alert.entity.id',
  'entity.id',
  'host.id',
  'host.name',
  'user.id',
  'user.name',
  'user.email',
  'service.name',
] as const;

interface UnattributedAggs {
  unattributed?: { doc_count: number };
}

export const fetchUnattributedAlerts = async (
  ctx: SnapshotContext
): Promise<UnattributedAlerts> => {
  const response = await ctx.esClient.search<unknown, UnattributedAggs>(
    {
      index: getAlertsIndex(ctx.spaceId),
      size: 0,
      track_total_hits: true,
      ignore_unavailable: true,
      query: {
        bool: {
          filter: [
            { range: { '@timestamp': { gte: ctx.timeRange.from, lte: ctx.timeRange.to } } },
            { terms: { 'kibana.alert.workflow_status': [...ACTIVE_WORKFLOW_STATUSES] } },
          ],
          must_not: [{ exists: { field: 'kibana.alert.building_block_type' } }],
        },
      },
      aggs: {
        unattributed: {
          filter: {
            bool: { must_not: IDENTITY_FIELDS.map((field) => ({ exists: { field } })) },
          },
        },
      },
    },
    { signal: ctx.abortSignal }
  );
  return {
    total: totalOf(response.hits.total),
    unattributed: response.aggregations?.unattributed?.doc_count ?? 0,
  };
};

// ---------------------------------------------------------------------------------------------
// B10 Attack Discovery
// ---------------------------------------------------------------------------------------------

interface MaxTimestampAggs {
  latest?: { value: number | null; value_as_string?: string };
}

export const fetchAttackDiscoveryStatus = async (
  ctx: SnapshotContext
): Promise<AttackDiscoveryStatus> => {
  const [latestResponse, schedules] = await Promise.all([
    ctx.esClient.search<unknown, MaxTimestampAggs>(
      {
        index: getAttackDiscoveryIndices(ctx.spaceId),
        size: 0,
        ignore_unavailable: true,
        allow_no_indices: true,
        aggs: { latest: { max: { field: '@timestamp' } } },
      },
      { signal: ctx.abortSignal }
    ),
    ctx.services.rulesClient?.find({
      options: {
        filter: `alert.attributes.alertTypeId: ${ATTACK_DISCOVERY_SCHEDULES_ALERT_TYPE_ID} AND alert.attributes.enabled: true`,
        page: 1,
        perPage: 1,
      },
    }),
  ]);
  const latest = latestResponse.aggregations?.latest;
  return {
    ...(latest?.value != null ? { lastTimestamp: new Date(latest.value).toISOString() } : {}),
    enabledSchedules: schedules?.total ?? 0,
  };
};

// ---------------------------------------------------------------------------------------------
// B11 hunting leads
// ---------------------------------------------------------------------------------------------

export const fetchLeadsStatus = async (ctx: SnapshotContext): Promise<LeadsStatus> => {
  const response = await ctx.esClient.search<{ timestamp?: string }>(
    {
      index: getLeadsIndexName(ctx.spaceId),
      size: 1,
      track_total_hits: true,
      ignore_unavailable: true,
      allow_no_indices: true,
      sort: [{ timestamp: { order: 'desc', unmapped_type: 'date' } }],
      _source: ['timestamp'],
    },
    { signal: ctx.abortSignal }
  );
  const lastRun = response.hits.hits[0]?._source?.timestamp;
  return {
    indexExists: (response._shards?.total ?? 0) > 0,
    total: totalOf(response.hits.total),
    ...(lastRun ? { lastRun } : {}),
  };
};

// ---------------------------------------------------------------------------------------------
// B13 risk engine
// ---------------------------------------------------------------------------------------------

/** undefined when the Entity Store contract is unavailable. */
export const fetchRiskEngineStatus = async (
  ctx: SnapshotContext
): Promise<RiskEngineStatus | undefined> => {
  const { entityStore } = ctx.services;
  if (!entityStore) return undefined;
  const entries = await entityStore.getMaintainerStatus(ctx.spaceId, [RISK_SCORE_MAINTAINER_ID]);
  const entry = entries.find(({ id }) => id === RISK_SCORE_MAINTAINER_ID);
  return entry
    ? { taskStatus: entry.taskStatus, lastSuccessTimestamp: entry.lastSuccessTimestamp }
    : {};
};

// ---------------------------------------------------------------------------------------------
// B17 open High/Critical alerts in storylines with no case
// ---------------------------------------------------------------------------------------------

interface UncasedAggs {
  critical?: { doc_count: number };
  entities?: { buckets: AggregationsStringTermsBucketKeys[] };
}

export const fetchUncasedHighAlerts = async (
  ctx: SnapshotContext,
  entityIds: readonly string[]
): Promise<UncasedAlerts> => {
  if (entityIds.length === 0) return { total: 0, critical: 0, entityIds: [] };
  const response = await ctx.esClient.search<unknown, UncasedAggs>(
    {
      index: getAlertsIndex(ctx.spaceId),
      size: 0,
      track_total_hits: true,
      ignore_unavailable: true,
      query: {
        bool: {
          filter: [
            { range: { '@timestamp': { gte: ctx.timeRange.from, lte: ctx.timeRange.to } } },
            { term: { 'kibana.alert.workflow_status': 'open' } },
            { terms: { 'kibana.alert.severity': ['high', 'critical'] } },
            { terms: { 'kibana.alert.entity.id': [...entityIds] } },
          ],
          must_not: [
            { exists: { field: 'kibana.alert.building_block_type' } },
            { exists: { field: 'kibana.alert.case_ids' } },
          ],
        },
      },
      aggs: {
        critical: { filter: { term: { 'kibana.alert.severity': 'critical' } } },
        entities: { terms: { field: 'kibana.alert.entity.id', size: MAX_TERMS } },
      },
    },
    { signal: ctx.abortSignal }
  );
  return {
    total: totalOf(response.hits.total),
    critical: response.aggregations?.critical?.doc_count ?? 0,
    entityIds: (response.aggregations?.entities?.buckets ?? []).map(({ key }) => String(key)),
  };
};
