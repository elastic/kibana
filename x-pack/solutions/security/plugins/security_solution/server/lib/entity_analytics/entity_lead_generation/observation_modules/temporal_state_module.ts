/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import type { LeadEntity, Observation, ObservationModule, ObservationSeverity } from '../types';
import { getEntitiesSnapshotIndexPattern } from '../../entity_store/utils/entity_utils';
import type { EntityType as EntityTypeOpenAPI } from '../../../../../common/api/entity_analytics/entity_store/common.gen';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const MODULE_ID = 'temporal_state_analysis';
const MODULE_NAME = 'Temporal State Analysis';
const MODULE_PRIORITY = 9;
const MODULE_WEIGHT = 0.25;

const SUPPORTED_ENTITY_TYPES: EntityTypeOpenAPI[] = ['user', 'host'];

// ---------------------------------------------------------------------------
// Temporal State Analysis Module
//
// Detects shifts in entity state over time using Entity Store latest + history.
// - privilege_escalation: entity was non-privileged, now privileged (from history).
// - investigation_status / watchlist_inclusion: reserved for future data sources.
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
}: TemporalStateModuleDeps): ObservationModule => {
  return {
    config: {
      id: MODULE_ID,
      name: MODULE_NAME,
      priority: MODULE_PRIORITY,
      weight: MODULE_WEIGHT,
    },

    isEnabled(): boolean {
      return true;
    },

    async collect(entities: LeadEntity[]): Promise<Observation[]> {
      const observations: Observation[] = [];
      const privilegeEscalationByKey = await fetchPrivilegeEscalations(
        esClient,
        spaceId,
        entities,
        logger
      );

      for (const entity of entities) {
        const key = entityToKey(entity);
        const hadPrivilegeEscalation = privilegeEscalationByKey.get(key);
        if (hadPrivilegeEscalation) {
          observations.push(buildPrivilegeEscalationObservation(entity));
        }
      }

      logger.debug(
        `[${MODULE_ID}] Collected ${observations.length} observations from ${entities.length} entities`
      );
      return observations;
    },
  };
};

// ---------------------------------------------------------------------------
// Entity record accessors
// ---------------------------------------------------------------------------

const extractIsPrivileged = (entity: LeadEntity): boolean => {
  const record = entity.record as Record<string, unknown>;
  const entityField = record.entity as Record<string, unknown> | undefined;
  if (!entityField) return false;
  const attributes = entityField.attributes as { privileged?: boolean } | undefined;
  return attributes?.privileged === true;
};

// ---------------------------------------------------------------------------
// Privilege escalation: query Entity Store history for older privileged state
// ---------------------------------------------------------------------------

const fetchPrivilegeEscalations = async (
  esClient: ElasticsearchClient,
  spaceId: string,
  entities: LeadEntity[],
  logger: Logger
): Promise<Map<string, boolean>> => {
  const result = new Map<string, boolean>();
  const privilegedEntities = entities.filter(extractIsPrivileged);
  if (privilegedEntities.length === 0) return result;

  for (const entityType of SUPPORTED_ENTITY_TYPES) {
    const ofType = privilegedEntities.filter((e) => e.type === entityType);
    if (ofType.length > 0) {
      const names = ofType.map((e) => e.name);
      const historyPattern = getEntitiesSnapshotIndexPattern(
        entityType as EntityTypeOpenAPI,
        spaceId
      );

      try {
        const response = await esClient.search({
          index: historyPattern,
          size: ofType.length * 20,
          _source: [
            'entity.attributes.privileged',
            'entity.name',
            'user.name',
            'host.name',
            '@timestamp',
          ],
          sort: [{ '@timestamp': { order: 'asc' } }],
          query: {
            bool: {
              filter: [{ terms: { [`${entityType}.name`]: names } }],
            },
          },
        });

        const oldestByEntity = new Map<string, { privileged: boolean }>();
        for (const hit of response.hits.hits) {
          const src = hit._source as Record<string, unknown>;
          const entity = src?.entity as Record<string, unknown> | undefined;
          const typeBlock = src?.[entityType] as Record<string, unknown> | undefined;
          const nameVal = entity?.name ?? typeBlock?.name;
          const keyName = Array.isArray(nameVal) ? nameVal[0] : nameVal;
          if (typeof keyName === 'string' && names.includes(keyName)) {
            const key = `${entityType}:${keyName}`;
            if (!oldestByEntity.has(key)) {
              const attrs = entity?.attributes as { privileged?: boolean } | undefined;
              oldestByEntity.set(key, { privileged: attrs?.privileged === true });
            }
          }
        }

        for (const entity of ofType) {
          const key = entityToKey(entity);
          const oldest = oldestByEntity.get(key);
          if (oldest && !oldest.privileged) {
            result.set(key, true);
          }
        }
      } catch (error) {
        logger.warn(`[${MODULE_ID}] Failed to query privilege history for ${entityType}: ${error}`);
      }
    }
  }

  return result;
};

// ---------------------------------------------------------------------------
// Observation builders
// ---------------------------------------------------------------------------

const buildPrivilegeEscalationObservation = (entity: LeadEntity): Observation => ({
  entityId: entityToKey(entity),
  moduleId: MODULE_ID,
  type: 'privilege_escalation',
  score: 85,
  severity: 'high' as ObservationSeverity,
  confidence: 0.85,
  description: `Entity ${entity.name} transitioned from non-privileged to privileged access`,
  metadata: {
    entity_type: entity.type,
  },
});

const entityToKey = (entity: LeadEntity): string => `${entity.type}:${entity.name}`;
