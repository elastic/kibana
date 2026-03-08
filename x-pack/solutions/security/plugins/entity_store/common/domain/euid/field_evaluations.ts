/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { get } from 'lodash';
import type { FieldEvaluation } from '../definitions/entity_schema';

function getSourceValue(doc: any, source: string): string | undefined {
  const flattened = doc[source];
  const value =
    flattened !== undefined && flattened !== null && flattened !== ''
      ? flattened
      : get(doc, source);
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

/**
 * Applies field evaluations to a document and returns a map of destination field to value.
 * First matching whenClause wins; if none matches, falls back to source value (first value if array).
 * Used before euid resolution so that getFieldValue(doc, 'entity.namespace') etc. see computed values.
 *
 * @param doc - The document (flat or nested)
 * @param fieldEvaluations - List of evaluations from identityField.fieldEvaluations
 * @returns Map of destination field name to evaluated value (string). Destinations are omitted when source is missing and no clause matches.
 */
export function applyFieldEvaluations(
  doc: any,
  fieldEvaluations: FieldEvaluation[]
): Record<string, string> {
  const result: Record<string, string> = {};
  for (const evaluation of fieldEvaluations) {
    const sourceValue = getSourceValue(doc, evaluation.source);
    if (sourceValue === undefined) {
      continue;
    }
    let value: string | undefined;
    for (const clause of evaluation.whenClauses) {
      if (clause.sourceMatchesAny.includes(sourceValue)) {
        value = clause.then;
        break;
      }
    }
    if (value === undefined) {
      value = sourceValue;
    }
    result[evaluation.destination] = value;
  }
  return result;
}
