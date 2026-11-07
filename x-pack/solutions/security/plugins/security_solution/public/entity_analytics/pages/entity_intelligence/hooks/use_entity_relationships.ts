/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { lastValueFrom } from 'rxjs';
import { useQuery } from '@kbn/react-query';
import type { IKibanaSearchResponse } from '@kbn/search-types';
import {
  EntityType,
  EntityTypeToIdentifierField,
} from '../../../../../common/entity_analytics/types';
import { fetchQueryAlerts } from '../../../../detections/containers/detection_engine/alerts/api';
import { useKibana } from '../../../../common/lib/kibana';
import type { IntelligenceEntity } from '../common';
import type { EdgeContext, EventContextAggregations, EventContextBucket } from '../event_context';
import { EMPTY_EDGE_CONTEXT, toEdgeContext } from '../event_context';

const DEFAULT_MAX_RELATED_PER_KIND = 8;

/** Index pattern for the raw ECS events that carry relationship context. */
export const EVENT_CONTEXT_INDEX = 'logs-*';
/** Bounded term size for concrete-detail sub-aggregations (dest, process, file). */
const EVENT_CONTEXT_DETAIL_SIZE = 3;
/** Bounded neighbor fan-out for the event-context aggregation. */
const EVENT_CONTEXT_MAX_NEIGHBORS = 24;

export type AlertSeverity = 'low' | 'medium' | 'high' | 'critical';

const SEVERITY_RANK: Record<AlertSeverity, number> = {
  low: 0,
  medium: 1,
  high: 2,
  critical: 3,
};

const isAlertSeverity = (value: string): value is AlertSeverity =>
  value === 'low' || value === 'medium' || value === 'high' || value === 'critical';

export type RelatedEntityKind = EntityType.user | EntityType.host | EntityType.service | 'ip';

export type RelationshipTimeRange = '24h' | '7d' | '30d' | '90d';

export interface RelationshipEntity {
  id: string;
  name: string;
  kind: RelatedEntityKind;
  identifierValue: string;
}

export interface RelationshipQueryParams {
  timeRange: RelationshipTimeRange;
  entityTypes: readonly RelatedEntityKind[];
  severities: readonly AlertSeverity[];
  sizeLimit?: number;
}

export interface RelatedEntity {
  /** Stable key: `<kind>:<name>` */
  id: string;
  name: string;
  kind: RelatedEntityKind;
  /** Number of alerts shared with the focus entity. */
  alertCount: number;
  /** Worst alert severity observed on the shared alerts. */
  worstSeverity: AlertSeverity | undefined;
  /**
   * Real event activity between the focus entity and this neighbor, pulled from
   * `logs-*`. Empty when no matching events were found (alert-only fallback).
   */
  context: EdgeContext;
}

export interface EntityRelationships {
  related: RelatedEntity[];
  totalAlerts: number;
}

interface SeverityBucket {
  key: string;
  doc_count: number;
}

interface RelatedTermsBucket {
  key: string;
  doc_count: number;
  severities: { buckets: SeverityBucket[] };
}

interface RelationshipsAggs {
  related_users: { buckets: RelatedTermsBucket[] };
  related_hosts: { buckets: RelatedTermsBucket[] };
  related_services: { buckets: RelatedTermsBucket[] };
  related_ips: { buckets: RelatedTermsBucket[] };
  related_destination_ips: { buckets: RelatedTermsBucket[] };
}

const relatedTermsAgg = (field: string, size: number) => ({
  terms: { field, size: size + 1 },
  aggs: { severities: { terms: { field: 'kibana.alert.severity', size: 4 } } },
});

const getIdentifierField = (kind: RelatedEntityKind): string | undefined =>
  kind === 'ip' ? undefined : EntityTypeToIdentifierField[kind];

export const buildRelationshipsQuery = (
  entity: RelationshipEntity,
  params: RelationshipQueryParams
): object => {
  const identifierField = getIdentifierField(entity.kind);
  const size = params.sizeLimit ?? DEFAULT_MAX_RELATED_PER_KIND;
  const filters: object[] = [
    entity.kind === 'ip'
      ? {
          bool: {
            should: [
              { term: { 'source.ip': entity.identifierValue } },
              { term: { 'destination.ip': entity.identifierValue } },
            ],
            minimum_should_match: 1,
          },
        }
      : { term: { [identifierField as string]: entity.identifierValue } },
    { range: { '@timestamp': { gte: `now-${params.timeRange}`, lte: 'now' } } },
  ];
  if (params.severities.length > 0 && params.severities.length < 4) {
    filters.push({ terms: { 'kibana.alert.severity': params.severities } });
  }

  return {
    size: 0,
    query: {
      bool: { filter: filters },
    },
    aggs: {
      related_users: relatedTermsAgg('user.name', size),
      related_hosts: relatedTermsAgg('host.name', size),
      related_services: relatedTermsAgg('service.name', size),
      related_ips: relatedTermsAgg('source.ip', size),
      related_destination_ips: relatedTermsAgg('destination.ip', size),
    },
  };
};

const worstSeverityOf = (buckets: SeverityBucket[]): AlertSeverity | undefined => {
  let worst: AlertSeverity | undefined;
  for (const bucket of buckets) {
    if (isAlertSeverity(bucket.key)) {
      if (worst === undefined || SEVERITY_RANK[bucket.key] > SEVERITY_RANK[worst]) {
        worst = bucket.key;
      }
    }
  }
  return worst;
};

const toRelatedEntities = (
  buckets: RelatedTermsBucket[],
  kind: RelatedEntityKind,
  excludeName: string | undefined,
  size: number
): RelatedEntity[] =>
  buckets
    .filter((bucket) => bucket.key !== excludeName)
    .slice(0, size)
    .map((bucket) => ({
      id: `${kind}:${bucket.key}`,
      name: bucket.key,
      kind,
      alertCount: bucket.doc_count,
      worstSeverity: worstSeverityOf(bucket.severities.buckets),
      context: EMPTY_EDGE_CONTEXT,
    }));

/**
 * Derives entity relationships by aggregating the security alerts index: for
 * the focus entity, every co-occurring `user.name` / `host.name` / `source.ip`
 * value on its alerts becomes a related node, weighted by shared-alert count
 * and colored by the worst severity seen. Uses the detection engine signals
 * search API, so it inherits space-scoped alert index resolution and RBAC.
 */
/**
 * Builds a bounded aggregation over `logs-*` that summarizes, per neighbor,
 * the concrete event activity connecting the focus entity to that neighbor.
 *
 * Structure: a top-level `filters` aggregation with one named bucket per
 * neighbor (keyed by `<kind>:<name>`). Each neighbor bucket carries four
 * category sub-aggregations (network / authentication / process / file), each a
 * small `terms` on the dominant concrete field plus min/max timestamps. Every
 * fan-out is size-capped so the request stays bounded regardless of data shape.
 */
export const buildEventContextQuery = (
  entity: RelationshipEntity,
  neighbors: readonly RelationshipEntity[],
  timeRange: RelationshipTimeRange
): Record<string, unknown> => {
  const boundedNeighbors = neighbors.slice(0, EVENT_CONTEXT_MAX_NEIGHBORS);
  const focusFilter = eventEntityFilter(entity);

  const neighborFilters: Record<string, object> = {};
  for (const neighbor of boundedNeighbors) {
    neighborFilters[neighbor.id] = eventEntityFilter(neighbor);
  }

  const detailTerms = (field: string) => ({
    terms: { field, size: EVENT_CONTEXT_DETAIL_SIZE },
    aggs: {
      earliest: { min: { field: '@timestamp' } },
      latest: { max: { field: '@timestamp' } },
    },
  });

  return {
    size: 0,
    query: {
      bool: {
        filter: [
          focusFilter,
          { range: { '@timestamp': { gte: `now-${timeRange}`, lte: 'now' } } },
          { term: { 'event.kind': 'event' } },
        ],
      },
    },
    aggs: {
      neighbors: {
        filters: { filters: neighborFilters },
        aggs: {
          network_targets: {
            filter: { term: { 'event.category': 'network' } },
            aggs: { targets: detailTerms('destination.ip') },
          },
          auth_targets: {
            filter: { term: { 'event.category': 'authentication' } },
            aggs: { targets: detailTerms('host.name') },
          },
          process_targets: {
            filter: { term: { 'event.category': 'process' } },
            aggs: { targets: detailTerms('process.name') },
          },
          file_targets: {
            filter: { term: { 'event.category': 'file' } },
            aggs: { targets: detailTerms('file.path') },
          },
        },
      },
    },
  };
};

/** Filter matching raw events that involve an entity (any role). */
const eventEntityFilter = (entity: RelationshipEntity): object => {
  if (entity.kind === 'ip') {
    return {
      bool: {
        should: [
          { term: { 'source.ip': entity.identifierValue } },
          { term: { 'destination.ip': entity.identifierValue } },
        ],
        minimum_should_match: 1,
      },
    };
  }
  if (entity.kind === EntityType.host) {
    return {
      bool: {
        should: [
          { term: { 'host.name': entity.identifierValue } },
          { term: { 'host.target.name': entity.identifierValue } },
        ],
        minimum_should_match: 1,
      },
    };
  }
  return { term: { [EntityTypeToIdentifierField[entity.kind]]: entity.identifierValue } };
};

interface EventContextTargetsAgg {
  targets?: { buckets: EventContextBucket[] };
}

interface EventContextNeighborBucket {
  network_targets?: EventContextTargetsAgg;
  auth_targets?: EventContextTargetsAgg;
  process_targets?: EventContextTargetsAgg;
  file_targets?: EventContextTargetsAgg;
}

interface EventContextResponseAggs {
  neighbors?: {
    buckets: Record<string, EventContextNeighborBucket>;
  };
}

/**
 * Reduces the `logs-*` aggregation response into a per-neighbor
 * {@link EdgeContext} map keyed by neighbor id. Missing neighbors / categories
 * simply do not appear, so callers fall back to {@link EMPTY_EDGE_CONTEXT}.
 */
export const toEventContextByNeighbor = (
  aggregations: EventContextResponseAggs | undefined
): Map<string, EdgeContext> => {
  const result = new Map<string, EdgeContext>();
  const buckets = aggregations?.neighbors?.buckets;
  if (!buckets) return result;

  for (const [neighborId, bucket] of Object.entries(buckets)) {
    const flattened: EventContextAggregations = {
      network_targets: bucket.network_targets?.targets,
      auth_targets: bucket.auth_targets?.targets,
      process_targets: bucket.process_targets?.targets,
      file_targets: bucket.file_targets?.targets,
    };
    const context = toEdgeContext(flattened);
    if (context.totalEvents > 0) {
      result.set(neighborId, context);
    }
  }
  return result;
};

const mergeRelatedEntities = (entities: readonly RelatedEntity[]): RelatedEntity[] => {
  const merged = new Map<string, RelatedEntity>();
  for (const entity of entities) {
    const existing = merged.get(entity.id);
    if (!existing) {
      merged.set(entity.id, entity);
    } else {
      merged.set(entity.id, {
        ...existing,
        alertCount: Math.max(existing.alertCount, entity.alertCount),
        worstSeverity:
          existing.worstSeverity === undefined ||
          (entity.worstSeverity !== undefined &&
            SEVERITY_RANK[entity.worstSeverity] > SEVERITY_RANK[existing.worstSeverity])
            ? entity.worstSeverity
            : existing.worstSeverity,
        context: entity.context.totalEvents > 0 ? entity.context : existing.context,
      });
    }
  }
  return [...merged.values()];
};

const toRelationshipEntity = (
  entity: IntelligenceEntity | RelationshipEntity | undefined
): RelationshipEntity | undefined => {
  if (!entity) return undefined;
  if ('type' in entity && entity.type === EntityType.generic) return undefined;
  return {
    id: entity.id,
    name: entity.name,
    kind:
      'type' in entity
        ? entity.type === EntityType.user
          ? EntityType.user
          : entity.type === EntityType.host
          ? EntityType.host
          : EntityType.service
        : entity.kind,
    identifierValue: entity.identifierValue,
  };
};

const DEFAULT_PARAMS: RelationshipQueryParams = {
  timeRange: '90d',
  entityTypes: [EntityType.user, EntityType.host, EntityType.service, 'ip'],
  severities: ['low', 'medium', 'high', 'critical'],
};

export const useEntityRelationships = (
  inputEntity: IntelligenceEntity | RelationshipEntity | undefined,
  params: RelationshipQueryParams = DEFAULT_PARAMS
) => {
  const search = useKibana().services.data.search.search;
  const entity = toRelationshipEntity(inputEntity);
  const typesKey = [...params.entityTypes].sort().join(',');
  const severitiesKey = [...params.severities].sort().join(',');

  const { data, isLoading, isError, refetch } = useQuery(
    [
      'entityIntelligenceRelationships',
      entity?.kind,
      entity?.identifierValue,
      params.timeRange,
      typesKey,
      severitiesKey,
      params.sizeLimit ?? DEFAULT_MAX_RELATED_PER_KIND,
    ],
    async ({ signal }) => {
      if (!entity) {
        return undefined;
      }
      return fetchQueryAlerts<never, RelationshipsAggs>({
        query: buildRelationshipsQuery(entity, params),
        signal: signal ?? new AbortController().signal,
      });
    },
    {
      enabled: !!entity,
      retry: 1,
      refetchOnWindowFocus: false,
      keepPreviousData: false,
    }
  );

  /** Alert-derived neighbors (no event context yet). */
  const alertRelated = useMemo<RelatedEntity[] | undefined>(() => {
    if (!data?.aggregations || !entity) {
      return undefined;
    }
    const {
      related_users: users,
      related_hosts: hosts,
      related_services: services,
      related_ips: sourceIps,
      related_destination_ips: destinationIps,
    } = data.aggregations;
    const selfName = entity.identifierValue;
    const size = params.sizeLimit ?? DEFAULT_MAX_RELATED_PER_KIND;
    const enabledKinds = new Set(params.entityTypes);
    return mergeRelatedEntities([
      ...(enabledKinds.has(EntityType.user)
        ? toRelatedEntities(
            users.buckets,
            EntityType.user,
            entity.kind === EntityType.user ? selfName : undefined,
            size
          )
        : []),
      ...(enabledKinds.has(EntityType.host)
        ? toRelatedEntities(
            hosts.buckets,
            EntityType.host,
            entity.kind === EntityType.host ? selfName : undefined,
            size
          )
        : []),
      ...(enabledKinds.has(EntityType.service)
        ? toRelatedEntities(
            services.buckets,
            EntityType.service,
            entity.kind === EntityType.service ? selfName : undefined,
            size
          )
        : []),
      ...(enabledKinds.has('ip')
        ? [
            ...toRelatedEntities(
              sourceIps.buckets,
              'ip',
              entity.kind === 'ip' ? selfName : undefined,
              size
            ),
            ...toRelatedEntities(
              destinationIps.buckets,
              'ip',
              entity.kind === 'ip' ? selfName : undefined,
              size
            ),
          ]
        : []),
    ]).sort((a, b) => b.alertCount - a.alertCount);
  }, [data, entity, params.entityTypes, params.sizeLimit]);

  const neighborKey = (alertRelated ?? []).map(({ id }) => id).join('|');

  /**
   * Enriches the alert-derived neighbors with concrete event activity from
   * `logs-*`. Best-effort: any failure (missing index, RBAC, mapping) resolves
   * to an empty map so the graph keeps rendering with the alert-only summary.
   */
  const { data: contextByNeighbor } = useQuery(
    [
      'entityIntelligenceEventContext',
      entity?.kind,
      entity?.identifierValue,
      params.timeRange,
      neighborKey,
    ],
    async ({ signal }) => {
      if (!entity || !alertRelated || alertRelated.length === 0) {
        return new Map<string, EdgeContext>();
      }
      try {
        const response = await lastValueFrom(
          search<
            { params: Record<string, unknown> },
            IKibanaSearchResponse<{ aggregations?: unknown }>
          >(
            {
              params: {
                index: EVENT_CONTEXT_INDEX,
                allow_no_indices: true,
                ignore_unavailable: true,
                ...buildEventContextQuery(
                  entity,
                  alertRelated.map((neighbor) => ({
                    id: neighbor.id,
                    name: neighbor.name,
                    kind: neighbor.kind,
                    identifierValue: neighbor.name,
                  })),
                  params.timeRange
                ),
              },
            },
            { abortSignal: signal ?? undefined }
          )
        );
        return toEventContextByNeighbor(
          response.rawResponse?.aggregations as Parameters<typeof toEventContextByNeighbor>[0]
        );
      } catch {
        return new Map<string, EdgeContext>();
      }
    },
    {
      enabled: !!entity && !!alertRelated && alertRelated.length > 0,
      retry: 0,
      refetchOnWindowFocus: false,
      keepPreviousData: false,
    }
  );

  const relationships = useMemo<EntityRelationships | undefined>(() => {
    if (!alertRelated || !data || !entity) {
      return undefined;
    }
    const contexts = contextByNeighbor ?? new Map<string, EdgeContext>();
    const related = alertRelated.map((neighbor) => {
      const context = contexts.get(neighbor.id);
      return context ? { ...neighbor, context } : neighbor;
    });
    return { related, totalAlerts: data.hits.total.value };
  }, [alertRelated, contextByNeighbor, data, entity]);

  return { relationships, isLoading, isError, refetch };
};
