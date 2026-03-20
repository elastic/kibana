/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { get } from 'lodash';
import type { FieldEvaluation, FieldEvaluationSource } from '../definitions/entity_schema';

/** Result of resolving document + field evaluation into a filter-friendly spec (no EVAL). */
export type SourceMatchSpec = { type: 'unknown' } | { type: 'values'; values: string[] };

export function getFieldValue(doc: any, field: string): string | undefined {
  const flattened = doc[field];
  const value = isNotEmpty(flattened) ? flattened : get(doc, field);
  if (!isNotEmpty(value)) {
    return undefined;
  }
  if (Array.isArray(value)) {
    const first = value[0];
    return first !== undefined && first !== null ? String(first) : undefined;
  }
  if (typeof value === 'object') {
    return undefined;
  }
  return String(value);
}

function resolveSourceValue(doc: any, source: FieldEvaluationSource): string | undefined {
  if ('field' in source) {
    return getFieldValue(doc, source.field);
  }
  const raw = getFieldValue(doc, source.firstChunkOfField);
  if (raw === undefined || raw === '') {
    return undefined;
  }
  const idx = raw.indexOf(source.splitBy);
  const first = idx === -1 ? raw : raw.substring(0, idx);
  return first !== '' ? first : undefined;
}

/**
 * Resolves the document and a single field evaluation into a source match spec for building
 * ESQL/DSL filters without EVAL. Uses the same first-source-wins and whenClause logic as
 * applyFieldEvaluations; when a whenClause matches, returns that clause's sourceMatchesAny
 * so the filter can match any of those source values (e.g. okta or entityanalytics_okta).
 *
 * @param doc - The document (flat or nested)
 * @param evaluation - One entry from identityField.fieldEvaluations
 * @returns { type: 'unknown' } when no source has a value; otherwise { type: 'values', values }.
 */
export function getSourceMatchSpec(doc: any, evaluation: FieldEvaluation): SourceMatchSpec {
  let sourceValue: string | undefined;
  for (const source of evaluation.sources) {
    sourceValue = resolveSourceValue(doc, source);
    if (sourceValue !== undefined) {
      break;
    }
  }
  if (sourceValue === undefined) {
    return { type: 'unknown' };
  }
  for (const clause of evaluation.whenClauses) {
    if (clause.sourceMatchesAny.includes(sourceValue)) {
      return { type: 'values', values: clause.sourceMatchesAny };
    }
  }
  return { type: 'values', values: [sourceValue] };
}

/**
 * Applies field evaluations to a document and returns a map of destination field to value.
 * Tries each source in order; first matching whenClause wins; if none matches, uses raw source value; if no source has a value, uses fallbackValue.
 * Used before euid resolution so that getFieldValue(doc, 'entity.namespace') etc. see computed values.
 *
 * @param doc - The document (flat or nested)
 * @param fieldEvaluations - List of evaluations from identityField.fieldEvaluations
 * @returns Map of destination field name to evaluated value (string).
 */
export function applyFieldEvaluations(
  doc: any,
  fieldEvaluations: FieldEvaluation[]
): Record<string, string> {
  const result: Record<string, string> = {};
  for (const evaluation of fieldEvaluations) {
    let sourceValue: string | undefined;
    for (const source of evaluation.sources) {
      sourceValue = resolveSourceValue(doc, source);
      if (sourceValue !== undefined) {
        break;
      }
    }
    let value: string;
    if (sourceValue === undefined) {
      value = evaluation.fallbackValue;
    } else {
      value = sourceValue;
      for (const clause of evaluation.whenClauses) {
        if (clause.sourceMatchesAny.includes(value)) {
          value = clause.then;
          break;
        }
      }
    }
    result[evaluation.destination] = value;
  }
  return result;
}

function isNotEmpty(value: string): boolean {
  return value !== undefined && value !== null && value !== '';
}
