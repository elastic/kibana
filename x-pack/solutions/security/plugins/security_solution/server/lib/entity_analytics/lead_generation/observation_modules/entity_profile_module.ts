/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import type { LeadEntity, Observation, ObservationModule } from '../types';
import {
  makeObservation,
  getEntityField,
  entityTypeLabel,
  extractIsPrivileged,
  getAssetCriticality,
  isHighCriticality,
} from './utils';
import { OBSERVATION_MODULE_WEIGHTS } from './weights';

const MODULE_ID = 'entity_profile';
const MODULE_NAME = 'Entity Profile Analysis';
const MODULE_PRIORITY = 7;
const MODULE_WEIGHT = OBSERVATION_MODULE_WEIGHTS.entity_profile;

/** Minimum infrequently-accessed targets before the access pattern is notable. */
const UNFAMILIAR_ACCESS_THRESHOLD = 2;
/** Minimum distinct communication peers before breadth is notable. */
const BROAD_COMMUNICATION_THRESHOLD = 8;
/** An entity first seen within this window is treated as newly observed. */
const NEWLY_OBSERVED_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;

interface EntityBehaviors {
  readonly brute_force_victim?: boolean;
  readonly new_country_login?: boolean;
  readonly used_usb_device?: boolean;
}

interface EntityAttributes {
  readonly managed?: boolean;
  readonly mfa_enabled?: boolean;
  readonly privileged?: boolean;
}

interface EntityRelationships {
  readonly accesses_infrequently?: string[];
  readonly communicates_with?: string[];
}

interface EntityLifecycle {
  readonly first_seen?: string;
  readonly last_seen?: string;
}

/**
 * Derives lightweight behavioral and governance signals from fields already
 * present on the Entity Store record — no additional queries. These signals
 * give the synthesis step the context it needs to write specific hypotheses
 * (unfamiliar-host access, new-country logins, unmanaged privileged accounts)
 * rather than restating alert counts.
 */
interface EntityProfileModuleDeps {
  readonly logger: Logger;
}

export const createEntityProfileModule = ({
  logger,
}: EntityProfileModuleDeps): ObservationModule => ({
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
      observations.push(...buildProfileObservations(entity));
    }

    logger.debug(
      `[${MODULE_ID}] Collected ${observations.length} observations from ${entities.length} entities`
    );
    return observations;
  },
});

const buildProfileObservations = (entity: LeadEntity): Observation[] => {
  const entityField = getEntityField(entity);
  if (!entityField) return [];

  const behaviors = (entityField.behaviors as EntityBehaviors | undefined) ?? {};
  const attributes = (entityField.attributes as EntityAttributes | undefined) ?? {};
  const relationships = (entityField.relationships as EntityRelationships | undefined) ?? {};
  const lifecycle = (entityField.lifecycle as EntityLifecycle | undefined) ?? {};

  const label = entityTypeLabel(entity);
  const isPrivileged = extractIsPrivileged(entity);
  const criticality = getAssetCriticality(entity);
  const contextMeta = {
    entity_type: entity.type,
    ...(isPrivileged ? { is_privileged: true } : {}),
    ...(criticality ? { asset_criticality: criticality } : {}),
  };

  const observations: Observation[] = [];

  const infrequentTargets = relationships.accesses_infrequently ?? [];
  if (infrequentTargets.length >= UNFAMILIAR_ACCESS_THRESHOLD) {
    observations.push(
      makeObservation(entity, MODULE_ID, {
        type: 'unfamiliar_access',
        score: Math.min(100, infrequentTargets.length * 20),
        severity: 'medium',
        confidence: 0.6,
        description: `${label} ${entity.name} accessed ${infrequentTargets.length} infrequently-used entities, deviating from its usual access pattern`,
        metadata: {
          ...contextMeta,
          infrequent_access_count: infrequentTargets.length,
          sample_targets: infrequentTargets.slice(0, 5),
        },
      })
    );
  }

  if (behaviors.brute_force_victim === true) {
    observations.push(
      makeObservation(entity, MODULE_ID, {
        type: 'brute_force_target',
        score: 65,
        severity: 'high',
        confidence: 0.7,
        description: `${label} ${entity.name} was targeted by brute-force authentication attempts`,
        metadata: contextMeta,
      })
    );
  }

  if (behaviors.new_country_login === true) {
    observations.push(
      makeObservation(entity, MODULE_ID, {
        type: 'new_country_login',
        score: 55,
        severity: 'medium',
        confidence: 0.7,
        description: `${label} ${entity.name} logged in from a country not previously observed for this entity`,
        metadata: contextMeta,
      })
    );
  }

  if (behaviors.used_usb_device === true) {
    observations.push(
      makeObservation(entity, MODULE_ID, {
        type: 'usb_device_use',
        score: 35,
        severity: 'low',
        confidence: 0.6,
        description: `${label} ${entity.name} used a USB storage device, a potential data-exfiltration vector`,
        metadata: contextMeta,
      })
    );
  }

  const communicationPeers = relationships.communicates_with ?? [];
  if (communicationPeers.length >= BROAD_COMMUNICATION_THRESHOLD) {
    observations.push(
      makeObservation(entity, MODULE_ID, {
        type: 'broad_communication',
        score: Math.min(100, communicationPeers.length * 5),
        severity: 'low',
        confidence: 0.5,
        description: `${label} ${entity.name} communicated with ${communicationPeers.length} distinct entities, a broad footprint worth reviewing for lateral movement`,
        metadata: {
          ...contextMeta,
          communication_peer_count: communicationPeers.length,
        },
      })
    );
  }

  const newlyObserved = isNewlyObserved(lifecycle.first_seen);
  if (newlyObserved) {
    observations.push(
      makeObservation(entity, MODULE_ID, {
        type: 'newly_observed_entity',
        score: isPrivileged || isHighCriticality(entity) ? 55 : 40,
        severity: isPrivileged || isHighCriticality(entity) ? 'medium' : 'low',
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
  const elevated = isPrivileged || isHighCriticality(entity);
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
  UNFAMILIAR_ACCESS_THRESHOLD,
  BROAD_COMMUNICATION_THRESHOLD,
  NEWLY_OBSERVED_WINDOW_MS,
  buildProfileObservations,
};
