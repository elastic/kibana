/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EntityType, EuidAttribute } from '../definitions/entity_schema';
import { isSingleFieldIdentity } from '../definitions/entity_schema';
import { getEntityDefinitionWithoutId } from '../definitions/registry';
import {
  applyWhenConditionTrueSetFields,
  documentPassesCalculatedIdentityPipelineGate,
  getDocument,
  getEffectiveEuidRanking,
  getFieldsToBeFilteredOn,
  getFieldValue,
  isEuidField,
} from './commons';
import { applyFieldEvaluations } from './field_evaluations';

/**
 * Applies the calculated-identity evaluation pipeline (`fieldEvaluations`, then
 * `whenConditionTrueSetFieldsPreAgg`, then `whenConditionTrueSetFieldsAfterStats`) to a document,
 * returning a fresh object — `doc` itself is never mutated. Shared by {@link getEuidFromObject}
 * and {@link getEntityIdentifiersFromDocument}, and by callers (e.g. the creation gate) that need
 * to evaluate a `requires` condition against fields derived at identity-evaluation time
 * (e.g. `entity.namespace`), not just raw document fields.
 *
 * For single-field identities there is nothing to evaluate, so `doc` is returned unchanged.
 */
export function buildEvaluatedDoc(entityType: EntityType, doc: any): any {
  const entityDefinition = getEntityDefinitionWithoutId(entityType);
  const { identityField } = entityDefinition;

  if (isSingleFieldIdentity(identityField)) {
    return doc;
  }

  let evaluatedDoc = { ...doc };
  if (identityField.fieldEvaluations?.length) {
    const evaluated = applyFieldEvaluations(doc, identityField.fieldEvaluations);
    evaluatedDoc = { ...evaluatedDoc, ...evaluated };
  }
  if (entityDefinition.whenConditionTrueSetFieldsPreAgg?.length) {
    applyWhenConditionTrueSetFields(
      evaluatedDoc,
      entityDefinition.whenConditionTrueSetFieldsPreAgg
    );
  }
  if (entityDefinition.whenConditionTrueSetFieldsAfterStats?.length) {
    applyWhenConditionTrueSetFields(
      evaluatedDoc,
      entityDefinition.whenConditionTrueSetFieldsAfterStats
    );
  }
  return evaluatedDoc;
}

/**
 * Constructs an entity id from the provided entity type and document.
 *
 * It supports both flattened and nested document shapes.
 * If a document contains `_source` property, it will be unwrapped before processing.
 *
 * Example usage:
 * ```ts
 * import { getEuidFromObject } from './memory';
 *
 * const euid = getEuidFromObject('host', { host: { name: 'server1', domain: 'example.com' } });
 * // euid may look like:
 * // 'host:server1.example.com'
 * ```
 *
 * @param entityType - The entity type string (e.g. 'host', 'user', 'generic')
 * @param doc - The document to derive entity id from. May be a flattened or nested shape.
 * @returns An entity id string, or undefined if the document does not contain enough identifying information.
 */
export function getEuidFromObject(entityType: EntityType, doc: any) {
  if (!doc) {
    return undefined;
  }

  doc = getDocument(doc);
  const entityDefinition = getEntityDefinitionWithoutId(entityType);
  const { identityField } = entityDefinition;

  if (isSingleFieldIdentity(identityField)) {
    const value = getFieldValue(doc, identityField.singleField);
    if (value === undefined) {
      return undefined;
    }
    if (identityField.skipTypePrepend) {
      return value;
    }
    return `${entityType}:${value}`;
  }

  const evaluatedDoc = buildEvaluatedDoc(entityType, doc);

  if (!documentPassesCalculatedIdentityPipelineGate(evaluatedDoc, entityDefinition)) {
    return undefined;
  }

  const effectiveRanking = getEffectiveEuidRanking(evaluatedDoc, identityField);
  const composedId = getComposedFieldValues(evaluatedDoc, effectiveRanking);
  if (composedId.length === 0) {
    return undefined;
  }

  const rawId = composedId.join('');
  if (identityField.skipTypePrepend) {
    return rawId;
  }
  return `${entityType}:${rawId}`;
}

/**
 * Extracts identity field name → value pairs from a document (flattened, nested, or ES hit with `_source`)
 * using the same rules as {@link getEuidFromObject}. Use for entity store resolution / flyout identity seeds.
 */
export function getEntityIdentifiersFromDocument(
  entityType: EntityType,
  doc: unknown
): Record<string, string> | undefined {
  if (!doc) {
    return undefined;
  }

  const workingDoc = getDocument(doc);
  const entityDefinition = getEntityDefinitionWithoutId(entityType);
  const { identityField } = entityDefinition;

  if (isSingleFieldIdentity(identityField)) {
    const value = getFieldValue(workingDoc, identityField.singleField);
    if (value === undefined) {
      return undefined;
    }
    return { [identityField.singleField]: value };
  }

  const evaluatedDoc = buildEvaluatedDoc(entityType, workingDoc);

  if (!documentPassesCalculatedIdentityPipelineGate(evaluatedDoc, entityDefinition)) {
    return undefined;
  }

  const fieldsToBeFilteredOn = getFieldsToBeFilteredOn(
    evaluatedDoc,
    getEffectiveEuidRanking(evaluatedDoc, identityField)
  );
  if (fieldsToBeFilteredOn.rankingPosition === -1) {
    return undefined;
  }
  return fieldsToBeFilteredOn.values;
}

function getComposedFieldValues(doc: any, euidFields: EuidAttribute[][]): string[] {
  for (const composition of euidFields) {
    const composedFieldValues = composition.map((attr) => {
      if (isEuidField(attr)) {
        return getFieldValue(doc, attr.field);
      }
      return attr.sep;
    });

    if (composedFieldValues.every((value): value is string => value !== undefined)) {
      return composedFieldValues;
    }
  }
  return [];
}
