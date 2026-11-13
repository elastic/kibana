/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import type { HttpStart, IHttpFetchError } from '@kbn/core-http-browser';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { useQuery } from '@kbn/react-query';
import { unflattenObject } from '@kbn/object-utils';
import { ENTITY_STORE_ROUTES } from '@kbn/entity-store/common';
import { EntityType } from '../../../../common/entity_analytics/types';
import { normalizeMultiValueField } from '../normalize_multi_value_field';
import type { CriticalityLevelWithUnassigned } from '../../../../common/entity_analytics/asset_criticality/types';
import type { RiskSeverity, RiskStats } from '../../../../common/search_strategy';
import { mergeResolutionGroupValues } from '../../../../common/entity_analytics/entity_store/resolution_group_values';
import type { EntityAttachmentIdentifier } from './types';

export interface EntityForAttachment {
  entityType: EntityType;
  displayName: string;
  entityId?: string;
  isEntityInStore: boolean;
  firstSeen: string | null;
  lastSeen: string | null;
  /**
   * Top-level `@timestamp` on the entity store record (set by the entity
   * store transform whenever the doc is upserted). Used by the multi-entity
   * attachment table's "Last seen" column because it is guaranteed to be
   * present, unlike `entity.lifecycle.last_activity` which can be absent
   * when the entity has not been observed in logs yet.
   */
  timestamp: string | null;
  riskScore?: number;
  riskLevel?: RiskSeverity;
  /**
   * Full risk breakdown as stored on the entity store record. Used to feed the
   * chat card's risk summary table without running a second search-strategy
   * call (which would require Redux state not present in Agent Builder).
   */
  riskStats?: RiskStats;
  assetCriticality?: CriticalityLevelWithUnassigned;
  watchlistIds: string[];
  sources: string[];
}

export interface UseEntityForAttachmentResult {
  isLoading: boolean;
  error: IHttpFetchError | null;
  data: EntityForAttachment | null;
  refetch: () => void;
}

interface EntityRecordShape {
  '@timestamp'?: string;
  entity?: {
    id?: string;
    name?: string;
    /**
     * `entity.source` is a multi-value field in the entity store (see the
     * `MV_UNION(recent.entity.source, entity.source)` projection in
     * `entity_store/server/domain/logs_extraction`). Older snapshots may
     * still surface a single string, so accept either shape and normalise
     * downstream.
     */
    source?: string | string[];
    /**
     * `entity.attributes.watchlists` is a `keyword` field. Elasticsearch only
     * serialiZes it as an array when the document has multiple values; a single
     * watchlist membership comes back as a bare string. Accept either shape and
     * normaliZe downstream via `normalizeMultiValueField`.
     */
    attributes?: { watchlists?: string | string[] };
    lifecycle?: { first_seen?: string; last_activity?: string };
    risk?: Partial<RiskStats> & {
      calculated_level?: string;
      calculated_score?: number;
      calculated_score_norm?: number;
    };
    relationships?: {
      resolution?: { risk?: { calculated_level?: string; calculated_score_norm?: number } };
    };
  };
  asset?: { criticality?: string | null };
}

/** An entity's record and, for a resolution group, the records of its aliases. */
interface EntityRecords {
  record: EntityRecordShape | undefined;
  aliases: EntityRecordShape[];
}

interface ListEntitiesResponseShape {
  records?: EntityRecordShape[];
}

/** The resolution group route returns the raw stored records, whose fields may be dotted keys. */
interface ResolutionGroupResponseShape {
  target: Record<string, unknown>;
  aliases: Array<Record<string, unknown>>;
}

const ENTITY_ATTACHMENT_QUERY_KEY = 'AGENT_BUILDER_ENTITY_ATTACHMENT';
const ENTITY_STORE_API_VERSION = '2023-10-31';

const toEntityType = (identifierType: EntityAttachmentIdentifier['identifierType']): EntityType => {
  switch (identifierType) {
    case 'host':
      return EntityType.host;
    case 'user':
      return EntityType.user;
    case 'service':
      return EntityType.service;
    case 'generic':
    default:
      return EntityType.generic;
  }
};

/**
 * Builds an Elasticsearch bool filter that targets a single entity store
 * record by identifier. Prefers the canonical `entity.id` when the attachment
 * payload carries `entityStoreId` — this is the only way to resolve local
 * users, whose `entity.name` is a `user.name@host.name` composite that does
 * not match the stored `user.name`. When `entityStoreId` is absent (legacy
 * payloads) we fall back to the per-type identity field: `host.name`,
 * `user.name`, `service.name`, or `entity.id` for generic entities.
 */
const buildFilterQuery = (identifier: EntityAttachmentIdentifier): string | undefined => {
  const value = identifier.identifier;
  if (!value) return undefined;

  if (identifier.entityStoreId) {
    return JSON.stringify({
      bool: { filter: [{ term: { 'entity.id': identifier.entityStoreId } }] },
    });
  }

  let field: string;
  switch (identifier.identifierType) {
    case 'host':
      field = 'host.name';
      break;
    case 'user':
      field = 'user.name';
      break;
    case 'service':
      field = 'service.name';
      break;
    case 'generic':
    default:
      field = 'entity.id';
      break;
  }

  return JSON.stringify({
    bool: { filter: [{ term: { [field]: value } }] },
  });
};

const shapeRecord = (
  identifier: EntityAttachmentIdentifier,
  record: EntityRecordShape | undefined,
  aliases: EntityRecordShape[] = []
): EntityForAttachment => {
  const entityField = record?.entity;
  const assetField = record?.asset;
  const isGroup = identifier.mode === 'resolved' && Boolean(record);
  // As the entities page shows a group: its risk, the highest criticality, every source and watchlist,
  // the earliest first seen and the latest last seen.
  const group = isGroup && record ? mergeResolutionGroupValues([record, ...aliases]) : undefined;
  const groupRisk = isGroup ? entityField?.relationships?.resolution?.risk : undefined;

  const riskScore =
    groupRisk?.calculated_score_norm ??
    entityField?.risk?.calculated_score_norm ??
    entityField?.risk?.calculated_score;
  const riskLevel = (
    groupRisk?.calculated_score_norm !== undefined
      ? groupRisk.calculated_level
      : entityField?.risk?.calculated_level
  ) as RiskSeverity | undefined;

  const ownCriticality =
    (assetField?.criticality as CriticalityLevelWithUnassigned | null | undefined) ?? undefined;
  const assetCriticality = group
    ? (group.criticality as CriticalityLevelWithUnassigned | undefined) ?? ownCriticality
    : ownCriticality;

  const riskStats = entityField?.risk
    ? ({
        ...entityField.risk,
        rule_risks: (entityField.risk as { rule_risks?: unknown[] }).rule_risks ?? [],
        multipliers: (entityField.risk as { multipliers?: unknown[] }).multipliers ?? [],
      } as RiskStats)
    : undefined;

  return {
    entityType: toEntityType(identifier.identifierType),
    displayName: entityField?.name ?? identifier.identifier,
    entityId: entityField?.id,
    isEntityInStore: Boolean(record),
    firstSeen: group ? group.firstSeen ?? null : entityField?.lifecycle?.first_seen ?? null,
    lastSeen: group ? group.lastActivity ?? null : entityField?.lifecycle?.last_activity ?? null,
    timestamp: group ? group.lastSeen ?? null : record?.['@timestamp'] ?? null,
    riskScore,
    riskLevel,
    riskStats,
    assetCriticality,
    watchlistIds: group
      ? group.watchlists
      : normalizeMultiValueField(entityField?.attributes?.watchlists),
    sources: group ? group.sources : normalizeMultiValueField(entityField?.source),
  };
};

const fetchSingleRecord = async ({
  http,
  identifier,
  signal,
}: {
  http: HttpStart;
  identifier: EntityAttachmentIdentifier;
  signal?: AbortSignal;
}): Promise<EntityRecordShape | undefined> => {
  const filterQuery = buildFilterQuery(identifier);
  if (!filterQuery) return undefined;

  const entityType = toEntityType(identifier.identifierType);
  const response = await http.fetch<ListEntitiesResponseShape>(
    ENTITY_STORE_ROUTES.public.CRUD_GET,
    {
      version: ENTITY_STORE_API_VERSION,
      method: 'GET',
      query: {
        entity_types: [entityType],
        filterQuery,
        page: 1,
        per_page: 1,
        sort_field: '@timestamp',
        sort_order: 'desc',
      },
      signal,
    }
  );
  return response?.records?.[0];
};

/** The group's primary and all its aliases, in one request. */
const fetchResolutionGroup = async ({
  http,
  entityId,
  signal,
}: {
  http: HttpStart;
  entityId: string;
  signal?: AbortSignal;
}): Promise<EntityRecords> => {
  const { target, aliases } = await http.fetch<ResolutionGroupResponseShape>(
    ENTITY_STORE_ROUTES.public.RESOLUTION_GROUP,
    {
      version: ENTITY_STORE_API_VERSION,
      method: 'GET',
      query: { entity_id: entityId },
      signal,
    }
  );
  return {
    record: unflattenObject(target) as EntityRecordShape,
    aliases: aliases.map((alias) => unflattenObject(alias) as EntityRecordShape),
  };
};

const fetchEntity = async ({
  http,
  identifier,
  signal,
}: {
  http: HttpStart;
  identifier: EntityAttachmentIdentifier;
  signal?: AbortSignal;
}): Promise<EntityRecords> => {
  const { entityStoreId, mode } = identifier;
  if (mode === 'resolved' && entityStoreId) {
    return fetchResolutionGroup({ http, entityId: entityStoreId, signal });
  }
  return { record: await fetchSingleRecord({ http, identifier, signal }), aliases: [] };
};

/**
 * Fetches the entity store record for a single attachment identifier and
 * shapes it for the chat card.
 *
 * This hook intentionally bypasses `useEntityAnalyticsRoutes` /
 * `useEntityFromStore` because those pull in Security Solution's Redux store
 * (via `useIsExperimentalFeatureEnabled`) which is not present in Agent
 * Builder's provider tree. We call the public Entity Store v2 endpoint
 * directly with only `core`-level services so the hook works anywhere the
 * core Kibana context is available.
 */
export const useEntityForAttachment = (
  identifier: EntityAttachmentIdentifier | undefined,
  { skip = false }: { skip?: boolean } = {}
): UseEntityForAttachmentResult => {
  const { services } = useKibana<{ http: HttpStart }>();
  const http = services.http;

  const queryKey = useMemo(
    () => [
      ENTITY_ATTACHMENT_QUERY_KEY,
      identifier?.identifierType ?? '',
      identifier?.identifier ?? '',
      identifier?.entityStoreId ?? '',
      identifier?.mode ?? '',
    ],
    [identifier]
  );

  const enabled = Boolean(http) && !skip && Boolean(identifier?.identifier);

  const {
    data: records,
    isLoading,
    error,
    refetch,
  } = useQuery<EntityRecords | undefined, IHttpFetchError>({
    queryKey,
    queryFn: ({ signal }) => {
      if (!identifier || !http) {
        return undefined;
      }
      return fetchEntity({ http, identifier, signal });
    },
    enabled,
  });

  const data = useMemo<EntityForAttachment | null>(() => {
    if (!identifier) return null;
    return shapeRecord(identifier, records?.record, records?.aliases);
  }, [identifier, records]);

  return {
    isLoading: enabled && isLoading,
    error: (error as IHttpFetchError | null) ?? null,
    data,
    refetch: () => {
      refetch();
    },
  };
};
