/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { conditionToESQL } from '@kbn/streamlang';
import type { EntityType } from '../definitions/entity_schema';
import type { FieldEvaluation } from '../definitions/entity_schema';
import { isSingleFieldIdentity } from '../definitions/entity_schema';
import { getEntityDefinitionWithoutId } from '../definitions/registry';
import { esqlIsNotNullOrEmpty, esqlIsNullOrEmpty } from '../../esql/strings';
import {
  getDocument,
  getFieldValue,
  getFieldsToBeFilteredOn,
  getFieldsToBeFilteredOut,
  isEuidField,
  isEuidSeparator,
} from './commons';
import { applyFieldEvaluations } from './field_evaluations';

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

  if (isSingleFieldIdentity(identityField)) {
    const value = getFieldValue(doc, identityField.singleField);
    if (value === undefined) {
      return undefined;
    }
    return `(${identityField.singleField} == "${escapeEsqlString(value)}")`;
  }

  if (identityField.fieldEvaluations?.length) {
    const evaluated = applyFieldEvaluations(doc, identityField.fieldEvaluations);
    doc = { ...doc, ...evaluated };
  }
  const fieldsToBeFilteredOn = getFieldsToBeFilteredOn(doc, identityField.euidFields);
  if (fieldsToBeFilteredOn.rankingPosition === -1) {
    return undefined;
  }

  const onExpressions = Object.entries(fieldsToBeFilteredOn.values).map(
    ([field, value]) => `(${field} == "${escapeEsqlString(value)}")`
  );

  const toBeFilteredOut = getFieldsToBeFilteredOut(identityField.euidFields, fieldsToBeFilteredOn);
  const outExpressions = toBeFilteredOut.map((field) => `${esqlIsNullOrEmpty(field)}`);

  return `(${[...onExpressions, ...outExpressions].join(' AND ')})`;
}

/**
 * Supports source fields that are arrays by using MV_FIRST.
 */
function buildOneFieldEvaluationEsql(evaluation: FieldEvaluation): string {
  const { destination, source, whenClauses } = evaluation;
  const firstSource = `MV_FIRST(${source})`;
  const caseParts: string[] = [];
  for (const clause of whenClauses) {
    const conditions = clause.sourceMatchesAny
      .map((v) => `${firstSource} == "${escapeEsqlString(v)}"`)
      .join(' OR ');
    caseParts.push(`(${conditions}), "${escapeEsqlString(clause.then)}"`);
  }
  caseParts.push(firstSource);
  return `${destination} = CASE(${caseParts.join(', ')})`;
}

function escapeEsqlString(s: string): string {
  return s.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

/**
 * Returns an ESQL EVAL fragment for all field evaluations of the given entity type.
 * Use in a pipeline as | EVAL <result>. Returns empty string when there are no field evaluations.
 */
export function getFieldEvaluationsEsql(entityType: EntityType) {
  const { identityField } = getEntityDefinitionWithoutId(entityType);
  if (isSingleFieldIdentity(identityField)) {
    return undefined;
  }
  const evaluations = identityField.fieldEvaluations;
  if (!evaluations || evaluations.length === 0) {
    return undefined;
  }
  return evaluations.map(buildOneFieldEvaluationEsql).join(',\n ');
}

/**
 * Returns an ESQL WHERE condition requiring all identityField.fieldEvaluations source fields to be NOT NULL and not empty.
 * Use in the main query filter so only documents with source data reach the EVAL step (performance).
 * Supports source fields that are arrays by using MV_FIRST.
 */
export function getFieldEvaluationsSourcesFilterEsql(entityType: EntityType) {
  const { identityField } = getEntityDefinitionWithoutId(entityType);
  if (isSingleFieldIdentity(identityField)) {
    return undefined;
  }
  const evaluations = identityField.fieldEvaluations;
  if (!evaluations || evaluations.length === 0) {
    return undefined;
  }
  const conditions = evaluations
    .map((e) => `(${esqlIsNotNullOrEmpty(`MV_FIRST(${e.source})`)})`)
    .join(' AND ');
  return conditions;
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

  if (isSingleFieldIdentity(identityField)) {
    return `(${esqlIsNotNullOrEmpty(identityField.singleField)})`;
  }

  const filters = [conditionToESQL(identityField.documentsFilter)];

  const evaluationSourceFilter = getFieldEvaluationsSourcesFilterEsql(entityType);
  if (evaluationSourceFilter) {
    filters.push(evaluationSourceFilter);
  }

  if (filters.length === 1) {
    return filters[0];
  }

  return filters.map((filter) => `(${filter})`).join(' AND ');
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
  const mustPrependTypeId = withTypeId && !identityField.skipTypePrepend;

  if (isSingleFieldIdentity(identityField)) {
    return appendTypeIdIfNeeded(entityType, identityField.singleField, mustPrependTypeId);
  }

  if (identityField.euidFields.length === 0) {
    throw new Error('No euid fields found, invalid euid logic definition');
  }

  // If only one instruction with single field, no CASE logic is needed (unless conditional)
  if (identityField.euidFields.length === 1) {
    const instruction = identityField.euidFields[0];
    const comp = instruction.composition;
    const firstAttr = comp[0];
    if (isEuidSeparator(firstAttr)) {
      throw new Error('Separator found in single field, invalid euid logic definition');
    }
    if (comp.length === 1 && isEuidField(firstAttr)) {
      if (instruction.conditional) {
        const condEsql = `(${instruction.conditional.field} == "${escapeEsqlString(
          instruction.conditional.eq
        )}")`;
        const caseExpr = `CASE((${condEsql}) AND (${esqlIsNotNullOrEmpty(firstAttr.field)}), ${
          firstAttr.field
        }, NULL)`;
        return appendTypeIdIfNeeded(entityType, caseExpr, mustPrependTypeId);
      }
      return appendTypeIdIfNeeded(entityType, firstAttr.field, mustPrependTypeId);
    }
    // single instruction but composed: fall through to multi-branch CASE
  }

  const euidLogic = identityField.euidFields.map((instruction) => {
    const composedField = instruction.composition;
    if (composedField.length === 1 && isEuidSeparator(composedField[0])) {
      throw new Error('Separator found in single field, invalid euid logic definition');
    }

    const compositionConditions = composedField
      .filter(isEuidField)
      .map((f) => `${esqlIsNotNullOrEmpty(f.field)}`)
      .join(' AND ');

    if (isEuidSeparator(composedField[0])) {
      throw new Error('The first field of a composed field cannot be a separator');
    }

    const caseBooleanOp = instruction.conditional
      ? `(${instruction.conditional.field} == "${escapeEsqlString(
          instruction.conditional.eq
        )}") AND (${compositionConditions})`
      : compositionConditions;

    if (composedField.length === 1) {
      return `(${caseBooleanOp}), ${(composedField[0] as { field: string }).field}`;
    }

    const evaluations = composedField
      .map((attr) => (isEuidField(attr) ? attr.field : `"${escapeEsqlString(attr.separator)}"`))
      .join(', ');

    const concatLogic = `CONCAT(${evaluations})`;

    return `(${caseBooleanOp}), ${concatLogic}`;
  });

  const idLogic = `CASE(${euidLogic.join(',\n')}, NULL)`;
  return appendTypeIdIfNeeded(entityType, idLogic, mustPrependTypeId);
}

function appendTypeIdIfNeeded(
  entityType: EntityType,
  euidLogic: string,
  mustPrependTypeId: boolean
) {
  if (mustPrependTypeId) {
    return `CONCAT("${entityType}:", ${euidLogic})`;
  }
  return euidLogic;
}
