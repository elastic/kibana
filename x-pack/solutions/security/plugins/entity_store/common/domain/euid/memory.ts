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
  getFieldValue,
  isEuidField,
} from './commons';
import { applyFieldEvaluations } from './field_evaluations';

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
  const { identityField } = getEntityDefinitionWithoutId(entityType);

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

  if (identityField.fieldEvaluations?.length) {
    const evaluated = applyFieldEvaluations(doc, identityField.fieldEvaluations);
    doc = { ...doc, ...evaluated };
  }
  const entityDefinition = getEntityDefinitionWithoutId(entityType);
  if (entityDefinition.whenConditionTrueSetFieldsPreAgg?.length) {
    applyWhenConditionTrueSetFields(doc, entityDefinition.whenConditionTrueSetFieldsPreAgg);
  }
  if (entityDefinition.whenConditionTrueSetFieldsAfterStats?.length) {
    applyWhenConditionTrueSetFields(doc, entityDefinition.whenConditionTrueSetFieldsAfterStats);
  }

  if (!documentPassesCalculatedIdentityPipelineGate(doc, entityDefinition)) {
    return undefined;
  }

  const effectiveRanking = getEffectiveEuidRanking(doc, identityField);
  const composedId = getComposedFieldValues(doc, effectiveRanking);
  if (composedId.length === 0) {
    return undefined;
  }

  const rawId = composedId.join('');
  if (identityField.skipTypePrepend) {
    return rawId;
  }
  return `${entityType}:${rawId}`;
}

function getComposedFieldValues(doc: any, euidFields: EuidAttribute[][]): string[] {
  for (const composition of euidFields) {
    const composedFieldValues = composition.map((attr) => {
      if (isEuidField(attr)) {
        return getFieldValue(doc, attr.field);
      }
      return attr.sep;
    });

    if (composedFieldValues.every((value) => value !== undefined)) {
      return composedFieldValues;
    }
  }
  return [];
}
