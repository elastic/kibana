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
import { PRIVILEGED_USER_WATCHLIST_ID } from './observation_modules/utils';

const CANDIDATE_STRATEGIES = [
  {
    id: 'high_risk_score',
    size: 250,
    sortField: 'entity.risk.calculated_score_norm',
  },
  {
    id: 'newly_observed',
    size: 50,
    sortField: 'entity.lifecycle.first_seen',
    filter: { range: { 'entity.lifecycle.first_seen': { gte: 'now-7d' } } },
  },
  {
    id: 'ungoverned_privileged',
    size: 50,
    sortField: 'entity.risk.calculated_score_norm',
    filter: {
      bool: {
        filter: [
          {
            prefix: {
              'entity.attributes.watchlists': PRIVILEGED_USER_WATCHLIST_ID,
            },
          },
        ],
        should: [
          { term: { 'entity.attributes.managed': false } },
          { term: { 'entity.attributes.mfa_enabled': false } },
        ],
        minimum_should_match: 1,
      },
    },
  },
  {
    id: 'high_criticality',
    size: 50,
    sortField: 'entity.risk.calculated_score_norm',
    filter: { terms: { 'asset.criticality': ['high_impact', 'extreme_impact'] } },
  },
  {
    id: 'control_relationship',
    size: 100,
    sortField: 'entity.risk.calculated_score_norm',
    filter: {
      bool: {
        should: [
          { exists: { field: 'entity.relationships.administers.ids' } },
          { exists: { field: 'entity.relationships.owns.ids' } },
        ],
        minimum_should_match: 1,
      },
    },
  },
];

const MAX_CANDIDATE_ENTITIES = CANDIDATE_STRATEGIES.reduce((sum, s) => sum + s.size, 0);

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
 * Fetches candidates for lead generation by running every strategy in
 * {@link CANDIDATE_STRATEGIES} as one `_msearch` request, and dedupes the
 * results by EUID. Each strategy selects on a different signal (risk,
 * recency, privilege, criticality, etc.) so the resulting pool covers
 * entities a single risk-sorted fetch would miss, giving the downstream
 * observation modules a comprehensive batch to work from.
 */
export const fetchCandidateEntities = async (
  crudClient: EntityStoreCRUDClient,
  logger?: Logger
): Promise<LeadEntity[]> => {
  const results = await crudClient.listEntitiesBatch(
    CANDIDATE_STRATEGIES.map((strategy) => ({
      entityTypes: [],
      page: 1,
      perPage: strategy.size,
      sortField: strategy.sortField,
      sortOrder: 'desc',
      ...(strategy.filter ? { filterQuery: JSON.stringify(strategy.filter) } : {}),
    }))
  );

  const byId = new Map<string, LeadEntity>();
  let skipped = 0;
  results.forEach((result, i) => {
    if ('error' in result) {
      logger?.warn(
        `[LeadGeneration] Candidate strategy "${CANDIDATE_STRATEGIES[i].id}" failed, continuing with the rest: ${result.error}`
      );
      return;
    }
    for (const record of result.records) {
      const lead = entityRecordToLeadEntity(record);
      if (lead) {
        byId.set(lead.id, lead);
      } else {
        skipped += 1;
      }
    }
  });

  const leadEntities = [...byId.values()];

  logger?.debug(
    `[LeadGeneration] Entity selection: ${results
      .map((r, i) => `${CANDIDATE_STRATEGIES[i].id}=${'error' in r ? 'error' : r.records.length}`)
      .join(', ')} -> ${leadEntities.length} unique candidates (cap ${MAX_CANDIDATE_ENTITIES}${
      skipped > 0 ? `, skipped ${skipped} without EUID` : ''
    })`
  );

  return leadEntities;
};
