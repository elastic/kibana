/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getDocument, getFieldValue, evaluateStreamlangCondition } from '../euid/commons';
import {
  buildEvaluatedDoc,
  getEuidFromObject,
  getEntityIdentifiersFromDocument,
} from '../euid/memory';
import { getEntityDefinitionWithoutId } from './registry';
import type { EntityType, CreationRejectionReason } from './entity_schema';

export type EntityCreationRejectionReason =
  | CreationRejectionReason
  | 'event_outcome_failure'
  | 'entity_type_not_creatable'
  | 'no_identity';

export interface EntityCreationAccepted {
  accepted: true;
  /** The EUID derived from the source document (e.g. `user:alice@host-1@local`). */
  euid: string;
  /** Identity field name -> value (e.g. `{ 'user.name': 'alice', 'host.id': 'host-1', 'entity.namespace': 'local' }`). */
  identityFields: Record<string, string>;
}

export interface EntityCreationRejected {
  accepted: false;
  reason: EntityCreationRejectionReason;
}

export type EntityCreationCandidate = EntityCreationAccepted | EntityCreationRejected;

/**
 * Evaluates whether one entity type is creatable from one source document (typically a
 * representative alert `_source`), per the type's own `creatableFromDocument` definition (see
 * `entity_schema.ts`). Returns the EUID and identity fields to seed a new entity document when
 * accepted, or a rejection reason otherwise.
 *
 * A type with no `creatableFromDocument` (currently `generic`) is never creatable this way.
 *
 * `event.outcome: failure` is rejected for every creatable type, regardless of whether its own
 * `documentsFilter` also encodes it. Missing/`unknown` outcome is allowed, which keeps ML
 * anomaly-based alerts (e.g. PAD jobs, which never carry `event.outcome`) eligible for creation.
 */
export function getEntityCreationCandidate(
  entityType: EntityType,
  sourceDoc: unknown
): EntityCreationCandidate {
  if (!sourceDoc) {
    return { accepted: false, reason: 'no_identity' };
  }

  const doc = getDocument(sourceDoc);
  const { creatableFromDocument: rule } = getEntityDefinitionWithoutId(entityType);
  if (!rule) {
    return { accepted: false, reason: 'entity_type_not_creatable' };
  }

  if (getFieldValue(doc, 'event.outcome') === 'failure') {
    return { accepted: false, reason: 'event_outcome_failure' };
  }

  if (rule.requires) {
    const evaluatedDoc = buildEvaluatedDoc(entityType, doc);
    if (!evaluateStreamlangCondition(evaluatedDoc, rule.requires)) {
      // Guaranteed by the schema's refine: `rejectionReason` is required whenever `requires` is set.
      return { accepted: false, reason: rule.rejectionReason ?? 'no_identity' };
    }
  }

  const euid = getEuidFromObject(entityType, doc);
  const identityFields = getEntityIdentifiersFromDocument(entityType, doc);
  if (!euid || !identityFields) {
    return { accepted: false, reason: 'no_identity' };
  }

  return { accepted: true, euid, identityFields };
}
