/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { z } from '@kbn/zod/v4';
import type { ElasticsearchClient } from '@kbn/core/server';
import { executeEsql } from '@kbn/agent-builder-genai-utils';
import { getEntitiesAlias, ENTITY_LATEST } from '@kbn/entity-store/server';
import type { IdentifierType } from '../../../../common/api/entity_analytics/common/common.gen';

/**
 * Shared entity-resolution logic for the Entity Store V2 agent-builder tools
 */

/** ES|QL column names projected from the latest-entities index. */
export const ENTITY_STORE_ENTITY_TYPE_FIELD = 'entity.EngineMetadata.Type';
export const ENTITY_STORE_ENTITY_ID_FIELD = 'entity.id';
export const ENTITY_STORE_ENTITY_NAME_FIELD = 'entity.name';

export type EntityType = z.infer<typeof IdentifierType>;
export const ENTITY_IDENTIFIER_TYPES = ['host', 'user', 'service', 'generic'] as const;
export type EntityIdentifierType = (typeof ENTITY_IDENTIFIER_TYPES)[number];
export const isEntityType = (value: unknown): value is EntityIdentifierType =>
  typeof value === 'string' && (ENTITY_IDENTIFIER_TYPES as readonly string[]).includes(value);

/**
 * Strips the `{type}:` prefix from a canonical entity id so callers get the
 * bare identity value (host.name, user.name, service.name). For `generic`
 * entities we keep the full id because those records are matched on `entity.id`
 * directly.
 */
export const stripEntityIdPrefix = (
  entityId: string,
  identifierType: EntityIdentifierType
): string => {
  if (identifierType === 'generic') {
    return entityId;
  }
  const prefix = `${identifierType}:`;
  return entityId.startsWith(prefix) ? entityId.slice(prefix.length) : entityId;
};

/** Reads the value of a named ES|QL column from a result row. */
export const getRowValue = (
  columns: Array<{ name: string }>,
  row: unknown[],
  columnName: string
): unknown => {
  const idx = columns.findIndex((col) => col.name === columnName);
  return idx >= 0 ? row[idx] : undefined;
};

export const escapeEsqlString = (value: string): string =>
  value.replace(/\\/g, '\\\\').replace(/"/g, '\\"');

const escapeEsqlRlikePattern = (value: string): string => {
  const regexEscaped = value.replace(/[\\^$.*+?()[\]{}|]/g, '\\$&');
  return escapeEsqlString(regexEscaped);
};

/**
 * Prefixes a bare identifier with `{type}:` when an entity type is known, so an
 * exact `entity.id` lookup can match the canonical EUID. No-ops when already
 * prefixed or when no type is supplied.
 */
export const normalizeEntityId = (entityId: string, entityType?: EntityType): string => {
  if (!entityType) {
    return entityId;
  }
  const prefix = `${entityType}:`;
  return entityId.startsWith(prefix) ? entityId : `${prefix}${entityId}`;
};

/**
 * The four ways `findEntityById` can resolve an entity row, ordered by
 * decreasing confidence: an exact `entity.id` hit, an exact name hit, an
 * `entity.id` substring (RLIKE) match, or a name substring match.
 */
export type EntityMatchSource = 'exact_id' | 'exact_name' | 'rlike_id' | 'rlike_name';

interface FindEntityByIdParams {
  entityIndex: string;
  entityId: string;
  entityType?: EntityType;
  esClient: ElasticsearchClient;
}

export interface FindEntityByIdResult {
  source: EntityMatchSource;
  query: string;
  columns: Array<{ name: string; type: string }>;
  values: unknown[][];
}

/**
 * Resolves an entity from the latest-entities index using a four-tier cascade
 * (exact id → exact name → `entity.id` RLIKE → name RLIKE), stopping at the
 * first tier that returns rows.
 */
export const findEntityById = async ({
  entityIndex,
  entityId,
  entityType,
  esClient,
}: FindEntityByIdParams): Promise<FindEntityByIdResult> => {
  const normalizedEntityId = normalizeEntityId(entityId, entityType);
  const escapedNormalized = escapeEsqlString(normalizedEntityId);

  // 1. Exact id match (canonical key, uses prefix if entityType provided)
  const idQuery = `FROM ${entityIndex} | WHERE entity.id == "${escapedNormalized}" | LIMIT 1`;
  const idHit = await executeEsql({ query: idQuery, esClient });
  if (idHit.values.length > 0) {
    return { source: 'exact_id', query: idQuery, columns: idHit.columns, values: idHit.values };
  }

  // 2. Exact name match against entity.name, user.full_name, or host.name.
  // `user.full_name` and `host.name` are multi-valued `collect` fields in the
  // entity store, so we use MV_CONTAINS instead of `==` (which returns null
  // with a warning on MV inputs). LIMIT 2 still detects display-name
  // collisions so we can suppress the rich entity card and let the LLM
  // disambiguate.
  const escapedRaw = escapeEsqlString(entityId);
  const nameExactQuery =
    `FROM ${entityIndex} ` +
    `| WHERE entity.name == "${escapedRaw}" ` +
    `OR MV_CONTAINS(user.full_name, "${escapedRaw}") ` +
    `OR MV_CONTAINS(host.name, "${escapedRaw}") ` +
    `| LIMIT 2`;
  const nameExactHit = await executeEsql({ query: nameExactQuery, esClient });
  if (nameExactHit.values.length > 0) {
    return {
      source: 'exact_name',
      query: nameExactQuery,
      columns: nameExactHit.columns,
      values: nameExactHit.values,
    };
  }

  // 3. entity.id RLIKE fallback (substring match)
  const rlikePattern = escapeEsqlRlikePattern(entityId);
  const likeQuery = `FROM ${entityIndex} | WHERE entity.id RLIKE ".*${rlikePattern}.*" | LIMIT 5`;
  const likeHit = await executeEsql({ query: likeQuery, esClient });
  if (likeHit.values.length > 0) {
    return {
      source: 'rlike_id',
      query: likeQuery,
      columns: likeHit.columns,
      values: likeHit.values,
    };
  }

  // 4. entity.name / user.full_name RLIKE fallback (substring match)
  const nameQuery = `FROM ${entityIndex} | WHERE entity.name RLIKE ".*${rlikePattern}.*" OR user.full_name RLIKE ".*${rlikePattern}.*" | LIMIT 5`;
  const nameHit = await executeEsql({ query: nameQuery, esClient });
  return {
    source: 'rlike_name',
    query: nameQuery,
    columns: nameHit.columns,
    values: nameHit.values,
  };
};

/**
 * Decides whether a resolved entity result is trustworthy enough to render a
 * rich single-entity artifact (card or graph) for. Exact id/name matches are
 * always trusted; the `entity.id` RLIKE fallback is trusted only when the single
 * resolved row's stripped id equals the user's raw input (i.e. the LLM dropped
 * the "{type}:" prefix). The `entity.name` RLIKE fallback is never trusted —
 * display-name substring matches are too ambiguous to authoritatively render
 * for.
 */
export const isHighConfidenceSingleMatch = ({
  source,
  columns,
  values,
  entityId,
}: {
  source: EntityMatchSource;
  columns: Array<{ name: string }>;
  values: unknown[][];
  entityId: string;
}): boolean => {
  if (values.length !== 1) {
    return false;
  }
  if (source === 'exact_id' || source === 'exact_name') {
    return true;
  }
  if (source !== 'rlike_id') {
    return false;
  }
  const row = values[0];
  const rawType = getRowValue(columns, row, ENTITY_STORE_ENTITY_TYPE_FIELD);
  const rawId = getRowValue(columns, row, ENTITY_STORE_ENTITY_ID_FIELD);
  if (!isEntityType(rawType) || typeof rawId !== 'string') {
    return false;
  }
  return stripEntityIdPrefix(rawId, rawType) === entityId;
};

export interface EntityIdentity {
  identifierType: EntityIdentifierType;
  identifier: string;
  /** Canonical `entity.id` (EUID); absent when the row did not project it. */
  entityStoreId?: string;
}

/**
 * Extracts the entity identity from a resolved row: the type, the bare
 * identifier (`entity.name`, falling back to the stripped `entity.id`), and the
 * canonical `entity.id`. Returns `null` when the row lacks a usable type or
 * identifier.
 */
export const describeEntityRow = ({
  columns,
  row,
}: {
  columns: Array<{ name: string }>;
  row: unknown[];
}): EntityIdentity | null => {
  const rawType = getRowValue(columns, row, ENTITY_STORE_ENTITY_TYPE_FIELD);
  if (!isEntityType(rawType)) {
    return null;
  }

  const rawId = getRowValue(columns, row, ENTITY_STORE_ENTITY_ID_FIELD);
  const rawName = getRowValue(columns, row, ENTITY_STORE_ENTITY_NAME_FIELD);

  const entityStoreId = typeof rawId === 'string' && rawId.length > 0 ? rawId : undefined;
  const bareFromId = entityStoreId ? stripEntityIdPrefix(entityStoreId, rawType) : undefined;
  const bareName = typeof rawName === 'string' && rawName.length > 0 ? rawName : undefined;

  const identifier = bareName ?? bareFromId;
  if (!identifier) {
    return null;
  }

  return {
    identifierType: rawType,
    identifier,
    ...(entityStoreId ? { entityStoreId } : {}),
  };
};

interface EntityResolutionBase {
  source: EntityMatchSource;
  query: string;
  columns: Array<{ name: string; type: string }>;
  values: unknown[][];
}

/**
 * - `not_found`   — no rows matched.
 * - `ambiguous`   — matched, but not a single trustworthy row (multiple
 *                   candidates or an untrusted fuzzy name match).
 * - `no_identity` — a single high-confidence row, but it lacks a usable
 *                   type/identifier (cannot build an identity).
 * - `resolved`    — a single high-confidence row with a usable `identity`.
 */
export type ResolveSingleEntityResult =
  | (EntityResolutionBase & { status: 'not_found' })
  | (EntityResolutionBase & {
      status: 'ambiguous';
      matchCount: number;
      candidateEntityIds: string[];
    })
  | (EntityResolutionBase & { status: 'no_identity' })
  | (EntityResolutionBase & { status: 'resolved'; identity: EntityIdentity });

export interface ResolveSingleEntityParams {
  esClient: ElasticsearchClient;
  spaceId: string;
  entityId: string;
  entityType?: EntityType;
}

/**
 * Resolves an `entityId` and classifies the outcome. Wraps `findEntityById` +
 * `isHighConfidenceSingleMatch` + `describeEntityRow` so both entity tools share
 * one resolution path; each branches on the returned `status`.
 */
export const resolveSingleEntity = async ({
  esClient,
  spaceId,
  entityId,
  entityType,
}: ResolveSingleEntityParams): Promise<ResolveSingleEntityResult> => {
  const entityIndex = getEntitiesAlias(ENTITY_LATEST, spaceId);
  const { source, query, columns, values } = await findEntityById({
    entityIndex,
    entityId,
    entityType,
    esClient,
  });
  const base: EntityResolutionBase = { source, query, columns, values };

  if (values.length === 0) {
    return { ...base, status: 'not_found' };
  }

  if (!isHighConfidenceSingleMatch({ source, columns, values, entityId })) {
    return {
      ...base,
      status: 'ambiguous',
      matchCount: values.length,
      candidateEntityIds: values
        .map((row) => getRowValue(columns, row, ENTITY_STORE_ENTITY_ID_FIELD))
        .filter((value): value is string => typeof value === 'string' && value.length > 0),
    };
  }

  const identity = describeEntityRow({ columns, row: values[0] });
  if (!identity) {
    return { ...base, status: 'no_identity' };
  }

  return { ...base, status: 'resolved', identity };
};
