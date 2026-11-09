/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import type { LeadEntity, Observation, ObservationModule } from '../types';
import type { EntityAttributes } from './utils';
import {
  makeObservation,
  entityTypeLabel,
  extractIsPrivileged,
  getAssetCriticality,
  getEntityAttributes,
  getEntityLifecycle,
  isHighCriticality,
} from './utils';
import { OBSERVATION_MODULE_WEIGHTS } from './weights';

const MODULE_ID = 'entity_attributes';
const MODULE_NAME = 'Entity Attributes Analysis';
const MODULE_PRIORITY = 7;
const MODULE_WEIGHT = OBSERVATION_MODULE_WEIGHTS.entity_attributes;

/** An entity first seen within this window is treated as newly observed. */
const NEWLY_OBSERVED_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * Derives governance and lifecycle signals from fields already present on the
 * Entity Store record — no additional queries. These give synthesis the
 * context to write hypotheses about new or poorly governed entities rather
 * than restating alert counts.
 */
interface EntityAttributesModuleDeps {
  readonly logger: Logger;
}

export const createEntityAttributesModule = ({
  logger,
}: EntityAttributesModuleDeps): ObservationModule => ({
  config: {
    id: MODULE_ID,
    name: MODULE_NAME,
    priority: MODULE_PRIORITY,
    weight: MODULE_WEIGHT,
  },

  isEnabled: () => true,

  async collect(entities: LeadEntity[]): Promise<Observation[]> {
    const observations: Observation[] = [];

    for (const entity of entities) {
      observations.push(...buildAttributeObservations(entity));
    }

    logger.debug(
      `[${MODULE_ID}] Collected ${observations.length} observations from ${entities.length} entities`
    );
    return observations;
  },
});

const buildAttributeObservations = (entity: LeadEntity): Observation[] => {
  const attributes = getEntityAttributes(entity) ?? {};
  const lifecycle = getEntityLifecycle(entity) ?? {};

  const label = entityTypeLabel(entity);
  const isPrivileged = extractIsPrivileged(entity);
  const criticality = getAssetCriticality(entity);
  const contextMeta = {
    entity_type: entity.type,
    ...(isPrivileged ? { is_privileged: true } : {}),
    ...(criticality ? { asset_criticality: criticality } : {}),
  };

  const observations: Observation[] = [];

  const newlyObserved = isNewlyObserved(lifecycle.first_seen);
  if (newlyObserved) {
    observations.push(
      makeObservation(entity, MODULE_ID, {
        type: 'newly_observed_entity',
        score: isPrivileged || isHighCriticality({ entity }) ? 55 : 40,
        severity: isPrivileged || isHighCriticality({ entity }) ? 'medium' : 'low',
        confidence: 0.6,
        description: `${label} ${entity.name} was first observed ${newlyObserved.daysAgo} day(s) ago and has limited behavioral history`,
        metadata: {
          ...contextMeta,
          first_seen: lifecycle.first_seen,
          days_since_first_seen: newlyObserved.daysAgo,
        },
      })
    );
  }

  const governanceGap = buildGovernanceGap(entity, attributes, isPrivileged, contextMeta);
  if (governanceGap) {
    observations.push(governanceGap);
  }

  return observations;
};

interface NewlyObserved {
  readonly daysAgo: number;
}

const isNewlyObserved = (firstSeen: string | undefined): NewlyObserved | undefined => {
  if (!firstSeen) return undefined;
  const firstSeenMs = Date.parse(firstSeen);
  if (Number.isNaN(firstSeenMs)) return undefined;
  const ageMs = Date.now() - firstSeenMs;
  if (ageMs < 0 || ageMs > NEWLY_OBSERVED_WINDOW_MS) return undefined;
  return { daysAgo: Math.max(0, Math.floor(ageMs / (24 * 60 * 60 * 1000))) };
};

const buildGovernanceGap = (
  entity: LeadEntity,
  attributes: EntityAttributes,
  isPrivileged: boolean,
  contextMeta: Record<string, unknown>
): Observation | undefined => {
  const elevated = isPrivileged || isHighCriticality({ entity });
  if (!elevated) return undefined;

  const gaps: string[] = [];
  if (attributes.managed === false) gaps.push('is unmanaged');
  if (attributes.mfa_enabled === false) gaps.push('lacks MFA');
  if (gaps.length === 0) return undefined;

  const label = entityTypeLabel(entity);
  const descriptor = isPrivileged
    ? `Privileged ${label.toLowerCase()}`
    : `High-criticality ${label.toLowerCase()}`;
  return makeObservation(entity, MODULE_ID, {
    type: 'governance_gap',
    score: isPrivileged ? 65 : 55,
    severity: isPrivileged ? 'high' : 'medium',
    confidence: 0.7,
    description: `${descriptor} ${entity.name} ${gaps.join(
      ' and '
    )}, weakening its security posture`,
    metadata: {
      ...contextMeta,
      managed: attributes.managed,
      mfa_enabled: attributes.mfa_enabled,
    },
  });
};

/** Exported for unit testing. */
export const __testables = {
  NEWLY_OBSERVED_WINDOW_MS,
  buildAttributeObservations,
};
