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
 * Whether {@link getEntityCreationCandidate} can ever accept `entityType` — i.e. whether its
 * definition declares `creatableFromSingleDocument` at all (currently every type except `generic`).
 */
export function isEntityTypeCreatableFromSingleDocument(entityType: EntityType): boolean {
  return getEntityDefinitionWithoutId(entityType).creatableFromSingleDocument !== undefined;
}

/**
 * Evaluates whether one entity type may be created from one source document per its
 * `creatableFromSingleDocument` definition, returning the EUID and identity fields to seed a new
 * entity document or a rejection reason.
 *
 * The gates exist because the caller holds a single document rather than an aggregation over the
 * whole corpus, so identity evidence is weaker than what logs extraction sees. They are therefore
 * evaluated against plain ECS and are indifferent to which index the document came from; a caller
 * that narrows to a particular source (the risk score maintainer uses alerts) owns that choice
 * entirely and still passes through here.
 */
export function getEntityCreationCandidate(
  entityType: EntityType,
  sourceDoc: unknown
): EntityCreationCandidate {
  if (!sourceDoc) {
    return { accepted: false, reason: 'no_identity' };
  }

  const doc = getDocument(sourceDoc);
  const { creatableFromSingleDocument: rule } = getEntityDefinitionWithoutId(entityType);
  if (!rule) {
    return { accepted: false, reason: 'entity_type_not_creatable' };
  }

  if (getFieldValue(doc, 'event.outcome') === 'failure') {
    return { accepted: false, reason: 'event_outcome_failure' };
  }

  if ('requires' in rule) {
    const evaluatedDoc = buildEvaluatedDoc(entityType, doc);
    if (!evaluateStreamlangCondition(evaluatedDoc, rule.requires)) {
      // `rejectionReason` is required whenever `requires` is set — enforced by
      // `creatableFromSingleDocumentSchema`'s union, not just a runtime refine.
      return { accepted: false, reason: rule.rejectionReason };
    }
  }

  const euid = getEuidFromObject(entityType, doc);
  const identityFields = getEntityIdentifiersFromDocument(entityType, doc);
  if (!euid || !identityFields) {
    return { accepted: false, reason: 'no_identity' };
  }

  return { accepted: true, euid, identityFields };
}
