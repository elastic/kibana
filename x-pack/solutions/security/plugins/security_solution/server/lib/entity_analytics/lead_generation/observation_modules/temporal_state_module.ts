/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import type { LeadEntity, Observation, ObservationModule, ObservationSeverity } from '../types';
import { makeObservation, extractIsPrivileged } from './utils';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const MODULE_ID = 'temporal_state_analysis';
const MODULE_NAME = 'Temporal State Analysis';
const MODULE_PRIORITY = 9;
const MODULE_WEIGHT = 0.25;

/**
 * V2 history snapshots are stored in a single unified index per namespace
 * (not per entity type). Pattern matches all date-hour suffixed indices.
 */
const getEntityStoreHistoryPattern = (namespace: string): string =>
  `.entities.v2.history.security_${namespace}*`;

// ---------------------------------------------------------------------------
// Temporal State Analysis Module
//
// Detects shifts in entity state over time using Entity Store snapshots.
// Currently: privilege_escalation (entity was non-privileged, is now privileged).
//
// Uses entity.id (EUID) for joins against snapshot indices since Entity Store
// V2 snapshots carry entity.id as the definitive unique identifier. This
// avoids issues with non-unique names and the entity.type field storing
// unexpected values (e.g. "Identity" instead of "user").
// ---------------------------------------------------------------------------

interface TemporalStateModuleDeps {
  readonly esClient: ElasticsearchClient;
  readonly logger: Logger;
  readonly spaceId: string;
}

export const createTemporalStateModule = ({
  esClient,
  logger,
  spaceId,
}: TemporalStateModuleDeps): ObservationModule => ({
  config: {
    id: MODULE_ID,
    name: MODULE_NAME,
    priority: MODULE_PRIORITY,
    weight: MODULE_WEIGHT,
  },

  isEnabled: () => true,

  async collect(entities: LeadEntity[]): Promise<Observation[]> {
    const escalated = await fetchPrivilegeEscalations(esClient, spaceId, entities, logger);
    const observations: Observation[] = [];

    for (const entity of entities) {
      if (escalated.has(entity.id)) {
        observations.push(buildPrivilegeEscalationObservation(entity));
      }
    }

    logger.debug(
      `[${MODULE_ID}] Collected ${observations.length} observations from ${entities.length} entities`
    );
    return observations;
  },
});

// ---------------------------------------------------------------------------
// Privilege escalation detection
//
// Strategy: for each currently-privileged entity, retrieve the earliest
// snapshot via a top_hits aggregation (size:0 outer query, no raw docs fetched
// beyond 1 per entity). If the oldest snapshot had privileged=false, it was
// escalated.
//
// Filters and aggregates on entity.id (EUID) — the unique identifier in
// Entity Store V2 snapshots — rather than entity.name or entity.type.
// ---------------------------------------------------------------------------

const fetchPrivilegeEscalations = async (
  esClient: ElasticsearchClient,
  spaceId: string,
  entities: LeadEntity[],
  logger: Logger
): Promise<Set<string>> => {
  const escalated = new Set<string>();
  const privilegedEntities = entities.filter(extractIsPrivileged);
  if (privilegedEntities.length === 0) return escalated;

  const historyPattern = getEntityStoreHistoryPattern(spaceId);
  const ids = privilegedEntities.map((e) => e.id);

  try {
    const response = await esClient.search({
      index: historyPattern,
      size: 0,
      ignore_unavailable: true,
      allow_no_indices: true,
      query: {
        bool: {
          filter: [{ terms: { 'entity.id': ids } }],
        },
      },
      aggs: {
        by_entity: {
          terms: { field: 'entity.id', size: ids.length },
          aggs: {
            oldest_snapshot: {
              top_hits: {
                size: 1,
                sort: [{ '@timestamp': { order: 'asc' } }],
                _source: ['entity.attributes.privileged'],
              },
            },
          },
        },
      },
    });

    const buckets = ((response.aggregations?.by_entity as Record<string, unknown>)?.buckets ??
      []) as Array<{
      key: string;
      oldest_snapshot: { hits: { hits: Array<{ _source: Record<string, unknown> }> } };
    }>;

    for (const bucket of buckets) {
      const hit = bucket.oldest_snapshot.hits.hits[0];
      if (hit) {
        const entityField = hit._source?.entity as Record<string, unknown> | undefined;
        const attrs = entityField?.attributes as { privileged?: boolean } | undefined;
        const wasPrivileged = attrs?.privileged === true;

        if (!wasPrivileged) {
          escalated.add(bucket.key);
        }
      }
    }
  } catch (error) {
    logger.warn(`[${MODULE_ID}] Failed to query privilege history: ${error}`);
  }

  return escalated;
};

// ---------------------------------------------------------------------------
// Observation builders
// ---------------------------------------------------------------------------

const buildPrivilegeEscalationObservation = (entity: LeadEntity): Observation =>
  makeObservation(entity, MODULE_ID, {
    type: 'privilege_escalation',
    score: 85,
    severity: 'high' as ObservationSeverity,
    confidence: 0.85,
    description: `Entity ${entity.name} transitioned from non-privileged to privileged access`,
    metadata: { entity_type: entity.type },
  });
