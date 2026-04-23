/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { get } from 'lodash';
import type { Condition } from '@kbn/streamlang';
import type {
  CalculatedEntityIdentity,
  EntityDefinitionWithoutId,
  EuidAttribute,
  EuidField,
  EuidSeparator,
  FieldEvaluationSource,
  FieldValueSchema,
} from '../definitions/entity_schema';
import { isSingleFieldIdentity } from '../definitions/entity_schema';

interface FieldValue {
  [key: string]: string;
}

/**
 * Assumes the document has previously been validated
 * to not be null or undefined.
 */
export function getDocument(doc: any): any {
  if (doc._source && typeof doc._source === 'object') {
    return doc._source;
  }
  return doc;
}

function isEmpty(value: any): boolean {
  return value === undefined || value === null || value === '';
}

export function getFieldValue(doc: any, field: string): string | undefined {
  const flattenedValue = doc[field];
  const fieldInObject = isEmpty(flattenedValue) ? get(doc, field) : flattenedValue;

  if (isEmpty(fieldInObject)) {
    return undefined;
  }

  // In theory we should not have multi valued fields.
  // However, it can still happen that elasticsearch
  // client returns an array of values.
  if (Array.isArray(fieldInObject)) {
    if (fieldInObject.length === 0) {
      return undefined;
    }
    const first = fieldInObject[0];
    return first !== undefined && first !== null ? String(first) : undefined;
  }

  if (typeof fieldInObject === 'object') {
    throw new Error(
      `Field ${field} is an object, can't convert to value (value: ${JSON.stringify(
        fieldInObject
      )})`
    );
  }

  return String(fieldInObject);
}

export function getCompositionFields(composition: EuidAttribute[]): string[] {
  return composition.filter(isEuidField).map((attr) => attr.field);
}

/**
 * Builds `documentsFilter` ∧ `postAggFilter` for DSL, ESQL, and single-doc gate evaluation.
 * Missing `documentsFilter` is treated as always true so a definition with only `postAggFilter` still applies.
 */
export function mergeDocumentsFilterAndPostAgg(
  documentsFilter?: Condition,
  postAggFilter?: Condition
): Condition {
  let condition: Condition = documentsFilter ?? { always: true };
  if (postAggFilter) {
    condition = { and: [condition, postAggFilter] };
  }
  return condition;
}

/**
 * Evaluates a streamlang condition against a document. Supports and, or, not, and field predicates.
 */
export function evaluateStreamlangCondition(doc: any, condition: unknown): boolean {
  if (!condition || typeof condition !== 'object') return false;
  const c = condition as Record<string, unknown>;
  if ('and' in c && Array.isArray(c.and)) {
    return (c.and as unknown[]).every((sub) => evaluateStreamlangCondition(doc, sub));
  }
  if ('or' in c && Array.isArray(c.or)) {
    return (c.or as unknown[]).some((sub) => evaluateStreamlangCondition(doc, sub));
  }
  if ('not' in c) {
    return !evaluateStreamlangCondition(doc, c.not);
  }
  if ('always' in c) return true;
  if ('never' in c) return false;
  if ('field' in c && typeof c.field === 'string') {
    const value = getFieldValue(doc, c.field);
    if ('eq' in c && c.eq !== undefined) return value === String(c.eq);
    if ('neq' in c && c.neq !== undefined) return value !== String(c.neq);
    if ('exists' in c) {
      const exists = value !== undefined && value !== null && value !== '';
      return c.exists === exists;
    }
    if ('includes' in c) {
      const fieldVal = getFieldValue(doc, c.field);
      if (fieldVal === undefined) return false;
      return String(fieldVal).includes(String(c.includes));
    }
  }
  return false;
}

/**
 * True when the document matches `documentsFilter` ∧ `postAggFilter` (same predicate as
 * `getEuidDslDocumentsContainsIdFilter` / logs extraction WHERE). `postAggFilter` uses
 * logical field names; main extraction ESQL applies `recent.` only when building the post-join WHERE.
 *
 * For single-field identity definitions, returns true (callers only use this on the
 * calculated-identity path after field evaluations).
 */
export function documentPassesCalculatedIdentityPipelineGate(
  doc: any,
  entityDefinition: EntityDefinitionWithoutId
): boolean {
  const { identityField, postAggFilter } = entityDefinition;
  if (isSingleFieldIdentity(identityField)) {
    return true;
  }
  return evaluateStreamlangCondition(
    doc,
    mergeDocumentsFilterAndPostAgg(identityField.documentsFilter, postAggFilter)
  );
}

/**
 * Resolves a FieldValue (literal, source, or composition) to a string for in-memory doc.
 */
export function resolveFieldValueSchema(doc: any, value: FieldValueSchema): string | undefined {
  if (typeof value === 'string') {
    return value;
  }
  if ('source' in value) {
    return getFieldValue(doc, value.source);
  }
  const { fields, sep } = value.composition;
  const values = fields.map((f) => getFieldValue(doc, f));
  if (values.some((v) => v === undefined)) {
    return undefined;
  }
  return values.join(sep);
}

/**
 * Applies when-condition field overrides to doc (source/composition resolved per entry).
 * Used for `whenConditionTrueSetFieldsPreAgg` and `whenConditionTrueSetFieldsAfterStats` on a single-document simulation.
 */
export function applyWhenConditionTrueSetFields(
  doc: any,
  entries: Array<{ condition: unknown; fields: Record<string, FieldValueSchema> }>
): void {
  for (const entry of entries) {
    if (evaluateStreamlangCondition(doc, entry.condition)) {
      for (const [field, value] of Object.entries(entry.fields)) {
        const resolved = resolveFieldValueSchema(doc, value);
        if (resolved !== undefined) {
          doc[field] = resolved;
        }
      }
    }
  }
}

/**
 * Returns the effective euid ranking for a document. Iterates branches in order;
 * returns the first matching branch's ranking. Doc must have fieldEvaluations and
 * whenConditionTrueSetFieldsPreAgg already applied.
 */
export function getEffectiveEuidRanking(
  doc: any,
  identityField: CalculatedEntityIdentity
): EuidAttribute[][] {
  const { euidRanking } = identityField;
  for (const branch of euidRanking.branches) {
    if (!branch.when || evaluateStreamlangCondition(doc, branch.when)) {
      return branch.ranking;
    }
  }
  return euidRanking.branches[euidRanking.branches.length - 1]?.ranking ?? [];
}

export function getFieldsToBeFilteredOn(
  doc: any,
  euidFields: EuidAttribute[][]
): { values: FieldValue; rankingPosition: number } {
  for (let i = 0; i < euidFields.length; i++) {
    const composition = euidFields[i];
    const fieldAttrs = composition.filter(isEuidField);
    const composedFieldValues = fieldAttrs.reduce(
      (acc, attr) => ({
        ...acc,
        [attr.field]: getFieldValue(doc, attr.field),
      }),
      {}
    );

    if (Object.values(composedFieldValues).every((v) => v !== undefined)) {
      return { values: composedFieldValues, rankingPosition: i };
    }
  }
  return { values: {}, rankingPosition: -1 };
}

export function getFieldsToBeFilteredOut(
  euidFields: EuidAttribute[][],
  fieldsToBeFilteredOn: { values: FieldValue; rankingPosition: number }
): string[] {
  const euidFieldsBeforeRanking = euidFields.slice(0, fieldsToBeFilteredOn.rankingPosition);
  const fieldsNotInTheId = euidFieldsBeforeRanking.flatMap(getCompositionFields);

  const toFilterOut: string[] = [];
  for (const field of fieldsNotInTheId) {
    if (!Object.keys(fieldsToBeFilteredOn.values).includes(field) && !toFilterOut.includes(field)) {
      toFilterOut.push(field);
    }
  }
  return toFilterOut;
}

export function isEuidField(attr: EuidAttribute): attr is EuidField {
  return 'field' in attr;
}

export function isEuidSeparator(attr: EuidAttribute): attr is EuidSeparator {
  return 'sep' in attr;
}

export function getSourceFieldNames(sources: FieldEvaluationSource[]): {
  exactMatchFields: string[];
  prefixMatchFields: string[];
} {
  const exactMatchFields: string[] = [];
  const prefixMatchFields: string[] = [];
  for (const source of sources) {
    if ('field' in source) {
      exactMatchFields.push(source.field);
    } else {
      prefixMatchFields.push(source.firstChunkOfField);
    }
  }
  return { exactMatchFields, prefixMatchFields };
}
