/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { get } from 'lodash';
import type { FieldEvaluation, FieldEvaluationSource } from '../definitions/entity_schema';

function getFieldValue(doc: any, field: string): string | undefined {
  const flattened = doc[field];
  const value =
    flattened !== undefined && flattened !== null && flattened !== '' ? flattened : get(doc, field);
  if (value === undefined || value === null || value === '') {
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
  const parts = raw.split(source.splitBy);
  const first = parts[0];
  return first !== undefined && first !== '' ? first : undefined;
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
      const resolved = sourceValue;
      value = resolved;
      for (const clause of evaluation.whenClauses) {
        if (clause.sourceMatchesAny.includes(resolved)) {
          value = clause.then;
          break;
        }
      }
    }
    result[evaluation.destination] = value;
  }
  return result;
}
