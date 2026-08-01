/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { euid } from '@kbn/entity-store/common/euid_helpers';

import type {
  AttackDiscoveryEntity,
  AttackDiscoveryObservableEntity,
} from '../../../../../../common/step_types/shared_schemas';
import {
  OBSERVABLE_TYPE_HOSTNAME,
  OBSERVABLE_TYPE_SERVICE_NAME,
  OBSERVABLE_TYPE_USER_NAME,
} from '../../../../../../common/observable_types';
import type { CorrelatedEntityType } from '../build_entity_candidates_query';
import type { EntityCandidate } from '../extract_entity_candidates';

const OBSERVABLE_TYPE_KEY_BY_ENTITY_TYPE: Record<CorrelatedEntityType, string> = {
  host: OBSERVABLE_TYPE_HOSTNAME,
  service: OBSERVABLE_TYPE_SERVICE_NAME,
  user: OBSERVABLE_TYPE_USER_NAME,
};

export interface ClassifiedEntities {
  entities: AttackDiscoveryEntity[];
  /**
   * Display values (e.g. `host.name`) of candidates that DID match the Entity
   * Store, so downstream observable extraction can skip re-reporting matched
   * entities as plain observables.
   */
  matchedIdentityValues: Set<string>;
  observableEntities: AttackDiscoveryObservableEntity[];
}

/**
 * Best-effort display value for a candidate: the winning identity branch's
 * `<type>.name` (e.g. `user.name`), any other identity field value, or the
 * raw EUID as a last resort.
 */
const getCandidateDisplayValue = ({
  entityType,
  euid: candidateEuid,
  sampleSource,
}: EntityCandidate): string => {
  const identityFields = euid.getEntityIdentifiersFromDocument(entityType, sampleSource);

  if (identityFields != null) {
    const preferred = identityFields[`${entityType}.name`];

    if (typeof preferred === 'string' && preferred.length > 0) {
      return preferred;
    }

    const firstIdentityValue = Object.values(identityFields).find(
      (value): value is string => typeof value === 'string' && value.length > 0
    );

    if (firstIdentityValue != null) {
      return firstIdentityValue;
    }
  }

  return candidateEuid;
};

/**
 * Splits EUID candidates into Entity Store matches (`entities`, EUID stored
 * as-is) and non-matches (`observableEntities`, host/user/service display
 * values with POC observable type keys).
 */
export const classifyEntities = ({
  candidates,
  matchedEuids,
}: {
  candidates: EntityCandidate[];
  matchedEuids: Set<string>;
}): ClassifiedEntities => {
  const entities: AttackDiscoveryEntity[] = [];
  const observableEntities: AttackDiscoveryObservableEntity[] = [];
  const matchedIdentityValues = new Set<string>();
  const seenEntityIds = new Set<string>();
  const seenObservables = new Set<string>();

  for (const candidate of candidates) {
    if (matchedEuids.has(candidate.euid)) {
      if (!seenEntityIds.has(candidate.euid)) {
        seenEntityIds.add(candidate.euid);
        entities.push({ id: candidate.euid, type: candidate.entityType });
      }

      matchedIdentityValues.add(getCandidateDisplayValue(candidate));
    } else {
      const typeKey = OBSERVABLE_TYPE_KEY_BY_ENTITY_TYPE[candidate.entityType];
      const value = getCandidateDisplayValue(candidate);
      const dedupeKey = `${typeKey}:${value}`;

      if (!seenObservables.has(dedupeKey)) {
        seenObservables.add(dedupeKey);
        observableEntities.push({ type_key: typeKey, value });
      }
    }
  }

  return { entities, matchedIdentityValues, observableEntities };
};
