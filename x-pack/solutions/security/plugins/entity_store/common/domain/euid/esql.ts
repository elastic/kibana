/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EntityType } from '../definitions/entity_schema';
import { getEntityDefinitionWithoutId } from '../definitions/registry';
import { esqlIsNotNullOrEmpty, esqlIsNullOrEmpty } from '../../esql/strings';
import {
  getDocument,
  getFieldsToBeFilteredOn,
  getFieldsToBeFilteredOut,
  isEuidField,
  isEuidSeparator,
} from './commons';

/**
 * Constructs an ESQL filter for the provided entity type and document.
 *
 * It supports both flattened and nested document shapes.
 * If a document contains `_source` property, it will be unwrapped before processing.
 *
 * Example usage:
 * ```ts
 * import { getEuidEsqlFilterBasedOnDocument } from './esql';
 *
 * const doc = { host: { name: 'server1', domain: 'example.com' } };
 * const filter = getEuidEsqlFilterBasedOnDocument('host', doc);
 * // filter may look like:
 * // '((host.name == "server1") AND (host.domain == "example.com") AND (host.entity.id IS NULL OR host.entity.id == ""))'
 * ```
 *
 * @param entityType - The entity type string (e.g. 'host', 'user', 'generic')
 * @param doc - The document to derive entity filter fields from. May be a flattened or nested shape.
 * @returns An ESQL filter string, or undefined if the document does not contain enough identifying information.
 */
export function getEuidEsqlFilterBasedOnDocument(entityType: EntityType, doc: any) {
  if (!doc) {
    return undefined;
  }

  doc = getDocument(doc);
  const { identityField } = getEntityDefinitionWithoutId(entityType);
  const fieldsToBeFilteredOn = getFieldsToBeFilteredOn(doc, identityField.euidFields);
  if (fieldsToBeFilteredOn.rankingPosition === -1) {
    return undefined;
  }

  const onExpressions = Object.entries(fieldsToBeFilteredOn.values).map(
    ([field, value]) => `(${field} == "${value}")`
  );

  const toBeFilteredOut = getFieldsToBeFilteredOut(identityField.euidFields, fieldsToBeFilteredOn);
  const outExpressions = toBeFilteredOut.map((field) => `${esqlIsNullOrEmpty(field)}`);

  return `(${[...onExpressions, ...outExpressions].join(' AND ')})`;
}

/**
 * Constructs an ESQL filter for the provided entity type that checks if the documents contains an entity id.
 *
 * You will need to prepend the result with a `| WHERE` clause, or just add to your existing WHERE clause.
 *
 * Example usage:
 * ```ts
 * import { getEuidEsqlDocumentsContainsIdFilter } from './esql';
 *
 * const filter = getEuidEsqlDocumentsContainsIdFilter('host');
 * // filter may look like:
 * // '((host.entity.id IS NOT NULL) OR (host.id IS NOT NULL) OR (host.name IS NOT NULL) OR (host.hostname IS NOT NULL))'
 * ```
 *
 * @param entityType - The entity type string (e.g. 'host', 'user', 'generic')
 * @returns An ESQL filter string that checks if the document contains an entity id.
 */
export function getEuidEsqlDocumentsContainsIdFilter(entityType: EntityType) {
  const { identityField } = getEntityDefinitionWithoutId(entityType);
  return identityField.requiresOneOfFields
    .map((field) => `(${esqlIsNotNullOrEmpty(field)})`)
    .join(' OR ');
}

/**
 * Constructs an ESQL evaluation for the provided entity type to generate the entity id.
 *
 * You will need to prepend the result with a `| EVAL` clause, or just add to your existing EVAL clause.
 *
 * Example usage:
 * ```ts
 * import { getEuidEsqlEvaluation } from './esql';
 *
 * const evaluation = getEuidEsqlEvaluation('host');
 * // evaluation may look like:
 * // 'CONCAT("host:", CASE((host.entity.id IS NOT NULL AND host.entity.id != ""), host.entity.id,
 * //                      (host.id IS NOT NULL AND host.id != ""), host.id,
 * //                      (host.name IS NOT NULL AND host.name != "" AND host.domain IS NOT NULL AND host.domain != ""), CONCAT(host.name, ".", host.domain),
 * //                      (host.hostname IS NOT NULL AND host.hostname != "" AND host.domain IS NOT NULL AND host.domain != ""), CONCAT(host.hostname, ".", host.domain),
 * //                      (host.name IS NOT NULL AND host.name != ""), host.name,
 * //                      (host.hostname IS NOT NULL AND host.hostname != ""), host.hostname, NULL))'
 * ```
 *
 * @param entityType - The entity type string (e.g. 'host', 'user', 'generic')
 * @param withTypeId - Whether to prepend the entity type to the evaluation. Defaults to true.
 * @returns An ESQL evaluation string that computes the entity id.
 */
export function getEuidEsqlEvaluation(
  entityType: EntityType,
  { withTypeId = true }: { withTypeId?: boolean } = {}
) {
  const { identityField } = getEntityDefinitionWithoutId(entityType);

  if (identityField.euidFields.length === 0) {
    throw new Error('No euid fields found, invalid euid logic definition');
  }

  // If only one field is defined, it must exist, no CASE logic is needed
  if (identityField.euidFields.length === 1) {
    const firstField = identityField.euidFields[0][0];
    if (isEuidSeparator(firstField)) {
      throw new Error('Separator found in single field, invalid euid logic definition');
    }

    return appendTypeIdIfNeeded(entityType, firstField.field, withTypeId);
  }

  const euidLogic = identityField.euidFields.map((composedField) => {
    if (composedField.length === 1) {
      if (isEuidSeparator(composedField[0])) {
        throw new Error('Separator found in single field, invalid euid logic definition');
      }
    }

    const caseBooleanOp = composedField
      .filter(isEuidField)
      .map((field) => `${esqlIsNotNullOrEmpty(field.field)}`)
      .join(' AND ');

    if (isEuidSeparator(composedField[0])) {
      throw new Error('The first field of a composed field cannot be a separator');
    }

    if (composedField.length === 1) {
      return `(${caseBooleanOp}), ${composedField[0].field}`;
    }

    const evaluations = composedField
      .map((field) => (isEuidField(field) ? field.field : `"${field.separator}"`))
      .join(', ');

    const concatLogic = `CONCAT(${evaluations})`;

    return `(${caseBooleanOp}), ${concatLogic}`;
  });

  const idLogic = `CASE(${euidLogic.join(',\n')}, NULL)`;
  return appendTypeIdIfNeeded(entityType, idLogic, withTypeId);
}

function appendTypeIdIfNeeded(entityType: EntityType, euidLogic: string, withTypeId: boolean) {
  if (withTypeId) {
    return `CONCAT("${entityType}:", ${euidLogic})`;
  }
  return euidLogic;
}
