/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import pMap from 'p-map';
import type { Logger } from '@kbn/core/server';
import type { RelationshipsClient } from '@kbn/entity-store/server';
import type { LeadEntity, Observation, ObservationModule } from '../types';
import { getEntityRelationships, type EntityRelationships } from '../entities_relationships';
import {
  makeObservation,
  entityTypeLabel,
  errorMessage,
  getAssetCriticality,
  isHighCriticality,
  getEntityRisk,
} from './utils';
import { OBSERVATION_MODULE_WEIGHTS } from './weights';

const MODULE_ID = 'entity_relationships';
const MODULE_NAME = 'Entity Relationship Analysis';
const MODULE_PRIORITY = 6;
const MODULE_WEIGHT = OBSERVATION_MODULE_WEIGHTS.entity_relationships;

const CONNECTED_TO_RISK_CRITICAL_BASE = 45;
const CONNECTED_TO_RISK_HIGH_BASE = 25;
const CONNECTED_TO_RISK_FRACTION_BONUS = 30;
const CONNECTED_TO_RISK_CONFIDENCE = 0.6;

const INFREQUENT_ACCESS_CRITICAL_POINTS = 80;
const INFREQUENT_ACCESS_HIGH_POINTS = 60;
const INFREQUENT_ACCESS_CONFIDENCE = 0.6;

const RELATIONSHIP_HISTORY_CONCURRENCY = 10;
const NEW_CONTROL_WINDOW_MS = 3 * 24 * 60 * 60 * 1000;
const NEW_CONTROL_CRITICAL_SCORE = 85;
const NEW_CONTROL_HIGH_SCORE = 70;
const NEW_CONTROL_CONFIDENCE = 0.7;

interface RelationshipModuleDeps {
  readonly logger: Logger;
  readonly relationshipsClient: RelationshipsClient;
  readonly entitiesMap: ReadonlyMap<string, LeadEntity>;
}

export const createRelationshipModule = ({
  logger,
  relationshipsClient,
  entitiesMap,
}: RelationshipModuleDeps): ObservationModule => ({
  config: {
    id: MODULE_ID,
    name: MODULE_NAME,
    priority: MODULE_PRIORITY,
    weight: MODULE_WEIGHT,
  },
  isEnabled: () => true,
  async collect(entities: LeadEntity[]): Promise<Observation[]> {
    const now = Date.now();

    // Each entity's `administers` history is resolved with its own query, so cap
    // how many run at once to avoid saturating Elasticsearch when there are many candidates
    const observations = (
      await pMap(
        entities,
        async (entity) => {
          try {
            return await buildRelationshipObservations(
              entity,
              entitiesMap,
              relationshipsClient,
              now,
              logger
            );
          } catch (error) {
            logger.warn(
              `[${MODULE_ID}] Failed to build relationship observations for ${
                entity.id
              }: ${errorMessage(error)}`
            );
            return [];
          }
        },
        { concurrency: RELATIONSHIP_HISTORY_CONCURRENCY }
      )
    ).flat();

    logger.debug(
      `[${MODULE_ID}] Collected ${observations.length} observations from ${entities.length} entities`
    );
    return observations;
  },
});

const buildRelationshipObservations = async (
  entity: LeadEntity,
  entitiesMap: ReadonlyMap<string, LeadEntity>,
  relationshipsClient: RelationshipsClient,
  now: number,
  logger: Logger
): Promise<Observation[]> => {
  const relationships = getEntityRelationships(entity);
  if (!relationships) return [];

  const observations: Observation[] = [];

  const connectedToRisk = buildConnectedToRiskObservation(entity, relationships, entitiesMap);
  if (connectedToRisk) {
    observations.push(connectedToRisk);
  }

  const sensitiveInfrequentAccess = buildSensitiveInfrequentAccessObservation(
    entity,
    relationships,
    entitiesMap
  );
  if (sensitiveInfrequentAccess) {
    observations.push(sensitiveInfrequentAccess);
  }

  const newControl = await buildNewControlObservation(
    entity,
    relationships,
    entitiesMap,
    relationshipsClient,
    now,
    logger
  );
  if (newControl) {
    observations.push(newControl);
  }

  logger.debug(
    `[${MODULE_ID}] Collected ${observations.length} relationship observations for ${entity.name}`
  );
  return observations;
};

/**
 * Fires when an entity communicates with one or more entities that are currently
 * High/Critical risk — circumstantial contamination via a lateral channel. The
 * worst peer's risk tier sets the base; the fraction of resolved communication
 * peers that are risky raises it, so a mostly-compromised neighborhood outscores
 * a hub that merely touches a few risky peers among many.
 */
const buildConnectedToRiskObservation = (
  entity: LeadEntity,
  relationships: EntityRelationships,
  entitiesMap: ReadonlyMap<string, LeadEntity>
): Observation | undefined => {
  const communicationPeers = relationships.communicates_with?.ids ?? [];
  if (communicationPeers.length === 0) return;

  const criticalRiskEntities: string[] = [];
  const highRiskEntities: string[] = [];
  let resolvedPeerCount = 0;
  for (const peerId of communicationPeers) {
    const peer = entitiesMap.get(peerId);
    if (peer) {
      resolvedPeerCount++;
      const riskLevel = getEntityRisk(peer)?.calculatedLevel;
      if (riskLevel === 'Critical') {
        criticalRiskEntities.push(peerId);
      } else if (riskLevel === 'High') {
        highRiskEntities.push(peerId);
      }
    }
  }

  const riskyCount = criticalRiskEntities.length + highRiskEntities.length;
  if (riskyCount === 0) return;

  const worstTier = criticalRiskEntities.length > 0 ? 'critical' : 'high';
  const base =
    worstTier === 'critical' ? CONNECTED_TO_RISK_CRITICAL_BASE : CONNECTED_TO_RISK_HIGH_BASE;
  const riskyFraction = riskyCount / resolvedPeerCount;
  return makeObservation(entity, MODULE_ID, {
    type: 'connected_to_risk',
    score: Math.round(base + riskyFraction * CONNECTED_TO_RISK_FRACTION_BONUS),
    severity: worstTier === 'critical' ? 'high' : 'medium',
    confidence: CONNECTED_TO_RISK_CONFIDENCE,
    description: `${entityTypeLabel(entity)} ${
      entity.name
    } communicates with ${riskyCount} high-risk entity(ies)`,
    metadata: {
      critical_risk_entities: criticalRiskEntities,
      high_risk_entities: highRiskEntities,
      total_communicating_count: communicationPeers.length,
    },
  });
};

/**
 * Fires when an entity infrequently accesses one or more high-value targets.
 */
const buildSensitiveInfrequentAccessObservation = (
  entity: LeadEntity,
  relationships: EntityRelationships,
  entitiesMap: ReadonlyMap<string, LeadEntity>
): Observation | undefined => {
  const infrequentlyAccessesRelationships = relationships.accesses_infrequently?.ids ?? [];
  if (infrequentlyAccessesRelationships.length === 0) return;

  // filter out entities that are not high-value (high criticality or high risk)
  const criticalEntities: string[] = [];
  const highEntities: string[] = [];
  for (const targetId of infrequentlyAccessesRelationships) {
    const target = entitiesMap.get(targetId);
    if (target) {
      const criticality = getAssetCriticality(target);
      const riskLevel = getEntityRisk(target)?.calculatedLevel;
      if (criticality === 'extreme_impact' || riskLevel === 'Critical') {
        criticalEntities.push(targetId);
      } else if (criticality === 'high_impact' || riskLevel === 'High') {
        highEntities.push(targetId);
      }
    }
  }

  const qualifyingCount = criticalEntities.length + highEntities.length;
  if (qualifyingCount === 0) return;

  const worstTier = criticalEntities.length > 0 ? 'critical' : 'high';
  return makeObservation(entity, MODULE_ID, {
    type: 'sensitive_infrequent_access',
    score:
      worstTier === 'critical' ? INFREQUENT_ACCESS_CRITICAL_POINTS : INFREQUENT_ACCESS_HIGH_POINTS,
    severity: worstTier === 'critical' ? 'high' : 'medium',
    confidence: INFREQUENT_ACCESS_CONFIDENCE,
    description: `${entityTypeLabel(entity)} ${
      entity.name
    } infrequently accessed ${qualifyingCount} high-value target(s)${
      criticalEntities.length > 0 ? `, including ${criticalEntities.length} critical-tier` : ''
    }`,
    metadata: {
      critical_accessed_entities: criticalEntities,
      high_accessed_entities: highEntities,
      total_infrequently_accessed_count: infrequentlyAccessesRelationships.length,
    },
  });
};

/**
 * Fires when an entity's control over a high-impact asset (an `administers`
 * edge) was first observed within a time window.
 */
const buildNewControlObservation = async (
  entity: LeadEntity,
  relationships: EntityRelationships,
  entitiesMap: ReadonlyMap<string, LeadEntity>,
  relationshipsClient: RelationshipsClient,
  now: number,
  logger: Logger
): Promise<Observation | undefined> => {
  const administersRelationships = relationships.administers?.ids ?? [];
  // filter out entities that are not high-impact
  const administeredEntities: Array<{ readonly id: string; readonly criticality: string }> = [];
  for (const entityId of administersRelationships) {
    const target = entitiesMap.get(entityId);
    if (target) {
      const criticality = getAssetCriticality(target);
      if (criticality && isHighCriticality({ criticality })) {
        administeredEntities.push({ id: entityId, criticality });
      }
    }
  }
  if (administeredEntities.length === 0) return;

  // fetch the earliest 'administers' relationship observation for each target
  let firstSeenByTarget;
  try {
    firstSeenByTarget = await relationshipsClient.getEarliestObservationByTarget({
      entityId: entity.id,
      kind: 'administers',
      targets: administeredEntities.map(({ id }) => id),
    });
  } catch (error) {
    logger.warn(
      `[${MODULE_ID}] Failed to fetch administers history for ${entity.id}: ${errorMessage(error)}`
    );
    return;
  }

  // only consider targets that were first observed within the NEW_CONTROL_WINDOW_MS window
  // to distinguish newly-formed relationships from long-standing ones
  const criticalEntities: string[] = [];
  const highEntities: string[] = [];
  for (const { id, criticality } of administeredEntities) {
    const firstSeenMs = firstSeenByTarget.get(id);
    if (firstSeenMs != null && now - firstSeenMs <= NEW_CONTROL_WINDOW_MS) {
      (criticality === 'extreme_impact' ? criticalEntities : highEntities).push(id);
    }
  }

  const entitiesCount = criticalEntities.length + highEntities.length;
  if (entitiesCount === 0) return;

  const worstTier = criticalEntities.length > 0 ? 'critical' : 'high';
  return makeObservation(entity, MODULE_ID, {
    type: 'new_control_over_critical_asset',
    score: worstTier === 'critical' ? NEW_CONTROL_CRITICAL_SCORE : NEW_CONTROL_HIGH_SCORE,
    severity: worstTier === 'critical' ? 'critical' : 'high',
    confidence: NEW_CONTROL_CONFIDENCE,
    description: `${entityTypeLabel(entity)} ${
      entity.name
    } recently gained control over ${entitiesCount} high-impact asset(s)`,
    metadata: {
      new_critical_controlled_entities: criticalEntities,
      new_high_controlled_entities: highEntities,
      total_administered_asset_count: administersRelationships.length,
    },
  });
};
