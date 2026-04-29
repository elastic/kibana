/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import { getHistorySnapshotIndexPattern } from '@kbn/entity-store/server';
import type { LeadEntity, Observation, ObservationModule, ObservationSeverity } from '../types';
import {
  PRIVILEGED_USER_WATCHLIST_ID,
  makeObservation,
  extractIsPrivileged,
  entityTypeLabel,
} from './utils';
import type { EntityType as EntityTypeOpenAPI } from '../../../../../common/api/entity_analytics/entity_store/common.gen';

const MODULE_ID = 'temporal_state_analysis';
const MODULE_NAME = 'Temporal State Analysis';
const MODULE_PRIORITY = 9;
const MODULE_WEIGHT = 0.25;

const SUPPORTED_ENTITY_TYPES: EntityTypeOpenAPI[] = ['user', 'host'];

/**
 * Detects shifts in entity state over time using Entity Store snapshots.
 * Currently: privilege_escalation (entity was non-privileged, is now privileged).
 */
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
    const escalations = await fetchPrivilegeEscalations(esClient, spaceId, entities, logger);
    const observations: Observation[] = [];

    for (const entity of entities) {
      if (escalations.has(`${entity.type}:${entity.name}`)) {
        observations.push(buildPrivilegeEscalationObservation(entity));
      }
    }

    logger.debug(
      `[${MODULE_ID}] Collected ${observations.length} observations from ${entities.length} entities`
    );
    return observations;
  },
});

/**
 * For each currently-privileged entity, retrieves the earliest snapshot via a
 * top_hits aggregation. If the oldest snapshot's `entity.attributes.watchlists`
 * did NOT include a privileged-user watchlist entry, the entity was escalated.
 */
const fetchPrivilegeEscalations = async (
  esClient: ElasticsearchClient,
  spaceId: string,
  entities: LeadEntity[],
  logger: Logger
): Promise<Set<string>> => {
  const escalated = new Set<string>();
  const privilegedEntities = entities.filter(extractIsPrivileged);
  if (privilegedEntities.length === 0) return escalated;

  for (const entityType of SUPPORTED_ENTITY_TYPES) {
    const ofType = privilegedEntities.filter((e) => e.type === entityType);
    if (ofType.length > 0) {
      const names = ofType.map((e) => e.name);
      const historyPattern = getHistorySnapshotIndexPattern(spaceId);

      try {
        const response = await esClient.search({
          index: historyPattern,
          size: 0,
          ignore_unavailable: true,
          allow_no_indices: true,
          query: {
            bool: { filter: [{ terms: { [`${entityType}.name`]: names } }] },
          },
          aggs: {
            by_entity: {
              terms: { field: `${entityType}.name`, size: names.length },
              aggs: {
                oldest_snapshot: {
                  top_hits: {
                    size: 1,
                    sort: [{ '@timestamp': { order: 'asc' } }],
                    _source: ['entity.attributes.watchlists'],
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
            const attrs = entityField?.attributes as { watchlists?: string[] } | undefined;
            const watchlists = Array.isArray(attrs?.watchlists) ? attrs.watchlists : [];
            const wasPrivileged = watchlists.some(
              (w) => typeof w === 'string' && w.startsWith(PRIVILEGED_USER_WATCHLIST_ID)
            );

            if (!wasPrivileged) {
              escalated.add(`${entityType}:${bucket.key}`);
            }
          }
        }
      } catch (error) {
        logger.warn(`[${MODULE_ID}] Failed to query privilege history for ${entityType}: ${error}`);
      }
    }
  }

  return escalated;
};

const buildPrivilegeEscalationObservation = (entity: LeadEntity): Observation =>
  makeObservation(entity, MODULE_ID, {
    type: 'privilege_escalation',
    score: 85,
    severity: 'high' as ObservationSeverity,
    confidence: 0.85,
    description: `${entityTypeLabel(entity)} ${
      entity.name
    } transitioned from non-privileged to privileged access`,
    metadata: { entity_type: entity.type },
  });
