/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { merge } from 'lodash';
import { set } from '@kbn/safer-lodash-set';
import type { Entity, EntityType } from '../../../common';
import {
  getDocument,
  getFieldValue,
  applyWhenConditionTrueSetFields,
} from '../../../common/domain/euid/commons';
import {
  applyFieldEvaluations,
  getFieldEvaluationsFromDefinition,
} from '../../../common/domain/euid/field_evaluations';
import { getEntityDefinitionWithoutId } from '../../../common/domain/definitions/registry';
import {
  isSingleFieldIdentity,
  type EntityDefinitionWithoutId,
} from '../../../common/domain/definitions/entity_schema';
import { ENTITY_SOURCE_FIELD } from '../../../common/domain/definitions/common_fields';
import type { EntityCreatedBy } from '../../../common/domain/definitions/common_fields';
import type { EntityCreationAccepted } from '../../../common/domain/definitions/creatable_from_document';

export interface BuildEntityFromSourceParams {
  entityType: EntityType;
  candidate: EntityCreationAccepted;
  /** Representative source document (e.g. an alert `_source`) the candidate was derived from. */
  source: unknown;
  createdBy: EntityCreatedBy;
  /** Additional dot-path fields to merge onto the document (e.g. `entity.risk.calculated_score`). */
  fields?: Record<string, unknown>;
}

/**
 * Builds a new entity document from a representative source document and an already-accepted
 * {@link EntityCreationAccepted} candidate (see `getEntityCreationCandidate`). Populates the
 * fields a real `createEntity` caller would send: `entity.id` plus its identity source fields,
 * `entity.name`, entity type scoping (`entity.EngineMetadata.*`), provenance (`entity.created_by`),
 * `entity.source`, and initial lifecycle timestamps. `@timestamp` is left to `validateAndTransformDoc`.
 */
export function buildEntityFromSource({
  entityType,
  candidate,
  source,
  createdBy,
  fields,
}: BuildEntityFromSourceParams): Entity {
  const doc = getDocument(source);
  const definition = getEntityDefinitionWithoutId(entityType);
  const built: Record<string, unknown> = {};

  set(built, 'entity.id', candidate.euid);
  for (const [field, value] of Object.entries(candidate.identityFields)) {
    set(built, field, value);
  }

  const untypedId = getUntypedId(entityType, candidate.euid, definition);
  set(built, 'entity.EngineMetadata.Type', entityType);
  set(built, 'entity.EngineMetadata.UntypedId', untypedId);
  set(built, 'entity.created_by', createdBy);

  const { name, confidence } = deriveEntityNameAndConfidence(definition, doc, built);
  // Matches extraction's own fallback (`entity.name = CASE(..., recent.entity.EngineMetadata.UntypedId)`)
  // rather than letting `validateAndTransformDoc` default to the full EUID.
  set(built, 'entity.name', name ?? untypedId);
  if (confidence !== undefined) {
    set(built, 'entity.confidence', confidence);
  }

  const entitySource = deriveEntitySource(definition, doc);
  if (entitySource !== undefined) {
    set(built, ENTITY_SOURCE_FIELD, entitySource);
  }

  const timestamp = getFieldValue(doc, '@timestamp');
  if (timestamp !== undefined) {
    set(built, 'entity.lifecycle.first_seen', timestamp);
    set(built, 'entity.lifecycle.last_seen', timestamp);
  }

  if (fields) {
    for (const [field, value] of Object.entries(fields)) {
      set(built, field, value);
    }
  }

  return built as Entity;
}

function getUntypedId(
  entityType: EntityType,
  euid: string,
  definition: EntityDefinitionWithoutId
): string {
  const { identityField } = definition;
  if (isSingleFieldIdentity(identityField) && identityField.skipTypePrepend) {
    return euid;
  }
  const prefix = `${entityType}:`;
  return euid.startsWith(prefix) ? euid.slice(prefix.length) : euid;
}

function deriveEntitySource(
  definition: EntityDefinitionWithoutId,
  doc: unknown
): string[] | undefined {
  const fieldEvaluations = getFieldEvaluationsFromDefinition(definition);
  if (fieldEvaluations.length === 0) {
    return undefined;
  }
  const evaluated = applyFieldEvaluations(doc, fieldEvaluations);
  const value = evaluated[ENTITY_SOURCE_FIELD];
  return value ? [value] : undefined;
}

/**
 * Derives `entity.name` (all types) and `entity.confidence` (user only).
 *
 * For definitions with `whenConditionTrueSetFieldsAfterStats` (currently user only), replays
 * the same after-STATS overrides logs extraction applies, so a maintainer-created local user
 * gets the same `entity.name` composition (`user.name` or `user.name@host.name`) and
 * `entity.confidence: medium` a real extraction run would produce. Other types fall back to
 * the `fields` entry whose destination is `entity.name` (e.g. `host.name`, `service.name`).
 */
function deriveEntityNameAndConfidence(
  definition: EntityDefinitionWithoutId,
  doc: unknown,
  built: Record<string, unknown>
): { name?: string; confidence?: string } {
  if (definition.whenConditionTrueSetFieldsAfterStats?.length) {
    const workingDoc = merge({}, doc, built);
    applyWhenConditionTrueSetFields(workingDoc, definition.whenConditionTrueSetFieldsAfterStats);
    const name = getFieldValue(workingDoc, 'entity.name');
    const confidence = getFieldValue(workingDoc, 'entity.confidence');
    if (name !== undefined || confidence !== undefined) {
      return { name, confidence };
    }
  }

  const nameField = definition.fields.find((field) => field.destination === 'entity.name');
  const name = nameField ? getFieldValue(doc, nameField.source) : undefined;
  return { name };
}
