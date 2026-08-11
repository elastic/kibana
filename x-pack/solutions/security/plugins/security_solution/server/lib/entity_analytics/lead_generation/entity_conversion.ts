/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import type { EntityStoreCRUDClient } from '@kbn/entity-store/server';
import type { Entity } from '@kbn/entity-store/common';
import type { LeadEntity } from './types';

const MAX_CANDIDATE_ENTITIES = 500;

/** Row shape returned by {@link EntityStoreCRUDClient.listEntities}. */
type EntityStoreEntity = Awaited<
  ReturnType<EntityStoreCRUDClient['listEntities']>
>['entities'][number];

/** Returns the first non-empty string from a string or array-of-strings value. */
const firstString = (value: unknown): string | undefined => {
  if (typeof value === 'string') {
    return value.trim() ? value : undefined;
  }
  if (Array.isArray(value)) {
    const found = value.find((v) => typeof v === 'string' && v.trim());
    return typeof found === 'string' ? found : undefined;
  }
  return undefined;
};

/**
 * Resolves a human-readable display name for an entity, preferring the
 * type-specific ECS identifier (`user.name`/`user.email`, `host.name`/
 * `host.hostname`, `service.name`) over the generic `entity.name`, falling back
 * to the EUID. This keeps bylines and entity chips readable instead of showing
 * an opaque GUID when `entity.name` happens to carry one. Best-effort: when the
 * source data only ever provided a GUID, there is no friendlier value to show.
 */
export const resolveDisplayName = (record: EntityStoreEntity, type: string, id: string): string => {
  const r = record as Record<string, unknown>;
  const entityField = r.entity as { name?: unknown } | undefined;

  const typeSpecificName = ((): string | undefined => {
    switch (type) {
      case 'user': {
        const user = r.user as { name?: unknown; email?: unknown } | undefined;
        return firstString(user?.name) ?? firstString(user?.email);
      }
      case 'host': {
        const host = r.host as { name?: unknown; hostname?: unknown } | undefined;
        return firstString(host?.name) ?? firstString(host?.hostname);
      }
      case 'service': {
        const service = r.service as { name?: unknown } | undefined;
        return firstString(service?.name);
      }
      default:
        return undefined;
    }
  })();

  return typeSpecificName ?? firstString(entityField?.name) ?? id;
};

/**
 * Convert an Entity Store V2 record into a LeadEntity, extracting the EUID
 * (`entity.id`) as the identity field plus the convenience `type` and `name`
 * fields. Returns `undefined` when the record has no EUID — such records
 * cannot be the subject of correct observations because they have no stable
 * identity to join against.
 */
export const entityRecordToLeadEntity = (record: EntityStoreEntity): LeadEntity | undefined => {
  const r = record as Record<string, unknown>;
  const entityField = r.entity as
    | { name?: string; type?: string; id?: string; EngineMetadata?: { Type?: string } }
    | undefined;
  const id = entityField?.id;
  if (!id) return undefined;
  const type = entityField?.EngineMetadata?.Type ?? entityField?.type ?? 'unknown';
  return {
    record: record as Entity,
    id,
    type,
    name: resolveDisplayName(record, type, id),
  };
};

/**
 * Fetch the top candidate entities from the V2 unified index, sorted by
 * risk score descending and capped at {@link MAX_CANDIDATE_ENTITIES}.
 *
 * Sorting and limiting are pushed to Elasticsearch via the CRUD client's
 * page-mode query so we avoid fetching all entities into Kibana memory.
 * Entities without a risk score sort last (ES `missing` default for desc).
 */
export const fetchCandidateEntities = async (
  crudClient: EntityStoreCRUDClient,
  logger?: Logger
): Promise<LeadEntity[]> => {
  const { entities, total } = await crudClient.listEntities({
    sortField: 'entity.risk.calculated_score_norm',
    sortOrder: 'desc',
    perPage: MAX_CANDIDATE_ENTITIES,
    page: 1,
  });

  const leadEntities = entities
    .map(entityRecordToLeadEntity)
    .filter((entity): entity is LeadEntity => entity !== undefined);
  const skipped = entities.length - leadEntities.length;

  logger?.debug(
    `[LeadGeneration] Entity selection: ${total ?? entities.length} total -> ${
      leadEntities.length
    } candidates (cap ${MAX_CANDIDATE_ENTITIES}${
      skipped > 0 ? `, skipped ${skipped} without EUID` : ''
    })`
  );

  return leadEntities;
};
