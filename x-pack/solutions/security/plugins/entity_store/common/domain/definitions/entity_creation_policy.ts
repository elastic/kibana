/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getDocument, getFieldValue } from '../euid/commons';
import { applyFieldEvaluations } from '../euid/field_evaluations';
import { getEuidFromObject, getEntityIdentifiersFromDocument } from '../euid/memory';
import { getEntityDefinitionWithoutId } from './registry';
import { isSingleFieldIdentity, type EntityType } from './entity_schema';
import { USER_ENTITY_NAMESPACE } from './user_entity_constants';

/**
 * Why entities can't be created from a synthetic doc using only definition gates:
 *
 * The user `postAggFilter` short-circuits when `entity.id` already exists on the doc
 * (`entityIdExistsAfterLookup`), which trivially passes for any doc we construct that
 * already carries the candidate EUID. The medium-confidence ("local") restriction below
 * is therefore an explicit policy check on the derived `entity.namespace`, not something
 * inherited from the entity definition's gates.
 */
export type EntityCreationRejectionReason =
  | 'event_outcome_failure'
  | 'entity_type_not_creatable'
  | 'user_not_local_namespace'
  | 'host_missing_host_id'
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
 * Shared creation gate: reject explicit `event.outcome: failure`. Missing/`unknown` outcome
 * is allowed, which keeps ML anomaly-based alerts (e.g. PAD jobs, which never carry
 * `event.outcome`) eligible for creation.
 */
function isEventOutcomeFailure(doc: unknown): boolean {
  return getFieldValue(doc, 'event.outcome') === 'failure';
}

/**
 * Evaluates the conservative "create if missing" policy for one entity type against one
 * source document (typically a representative alert `_source`). Returns the EUID and
 * identity fields to seed a new entity document when accepted, or a rejection reason
 * otherwise.
 *
 * Per-type policy:
 * - `user`: create only medium-confidence (`local` namespace) users — the alert must carry
 *   `user.name` and `host.id`. IdP namespaces are rejected: alerts can't legitimately pass
 *   the IdP gates (`event.kind` is rewritten to `signal` on alert documents), and an
 *   accidental non-local create would mint a high-confidence entity with no authoritative
 *   IdP evidence (`entity.confidence` is stamped from the namespace).
 * - `host`: create only when the alert carries `host.id` (`host:{host.id}`). Name-only
 *   alerts risk minting duplicates of entities already keyed by `host.id`, so they stay
 *   lookup-only.
 * - `service`: create from `service.name` — single-field identity, low duplicate risk.
 * - `generic`: never created from alerts. Its EUID is `entity.id` verbatim with no gates,
 *   so creating it here would be an arbitrary-string minting path.
 */
export function getEntityCreationCandidate(
  entityType: EntityType,
  sourceDoc: unknown
): EntityCreationCandidate {
  if (!sourceDoc) {
    return { accepted: false, reason: 'no_identity' };
  }

  const doc = getDocument(sourceDoc);

  if (entityType === 'generic') {
    return { accepted: false, reason: 'entity_type_not_creatable' };
  }

  if (isEventOutcomeFailure(doc)) {
    return { accepted: false, reason: 'event_outcome_failure' };
  }

  switch (entityType) {
    case 'user':
      return getUserCreationCandidate(doc);
    case 'host':
      return getHostCreationCandidate(doc);
    case 'service':
      return getServiceCreationCandidate(doc);
    default:
      return { accepted: false, reason: 'entity_type_not_creatable' };
  }
}

function getUserNamespace(doc: unknown): string | undefined {
  const { identityField } = getEntityDefinitionWithoutId('user');
  if (isSingleFieldIdentity(identityField)) {
    return undefined;
  }
  const evaluated = applyFieldEvaluations(doc, identityField.fieldEvaluations ?? []);
  const namespace = evaluated['entity.namespace'];
  return namespace ?? undefined;
}

function getUserCreationCandidate(doc: unknown): EntityCreationCandidate {
  if (getUserNamespace(doc) !== USER_ENTITY_NAMESPACE.Local) {
    return { accepted: false, reason: 'user_not_local_namespace' };
  }

  const euid = getEuidFromObject('user', doc);
  const identityFields = getEntityIdentifiersFromDocument('user', doc);
  if (!euid || !identityFields) {
    return { accepted: false, reason: 'no_identity' };
  }

  return { accepted: true, euid, identityFields };
}

function getHostCreationCandidate(doc: unknown): EntityCreationCandidate {
  if (getFieldValue(doc, 'host.id') === undefined) {
    return { accepted: false, reason: 'host_missing_host_id' };
  }

  const euid = getEuidFromObject('host', doc);
  const identityFields = getEntityIdentifiersFromDocument('host', doc);
  if (!euid || !identityFields) {
    return { accepted: false, reason: 'no_identity' };
  }

  return { accepted: true, euid, identityFields };
}

function getServiceCreationCandidate(doc: unknown): EntityCreationCandidate {
  const euid = getEuidFromObject('service', doc);
  const identityFields = getEntityIdentifiersFromDocument('service', doc);
  if (!euid || !identityFields) {
    return { accepted: false, reason: 'no_identity' };
  }

  return { accepted: true, euid, identityFields };
}
