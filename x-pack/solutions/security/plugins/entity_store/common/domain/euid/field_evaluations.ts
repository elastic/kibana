/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { get } from 'lodash';
import type { FieldEvaluation, FieldEvaluationRule } from '../definitions/entity_schema';

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
    return value.length > 0 ? String(value[0]) : undefined;
  }
  if (typeof value === 'object') {
    return undefined;
  }
  return String(value);
}

function evaluateRule(
  rule: FieldEvaluationRule,
  sourceValue: string | undefined
): string | null | undefined {
  if (rule.when === 'one_of') {
    if (sourceValue === undefined) {
      return undefined;
    }
    return rule.in.includes(sourceValue) ? rule.then : undefined;
  }
  if (rule.when === 'else') {
    return sourceValue ?? null;
  }
  return undefined;
}

/**
 * Applies field evaluation rules to a document and returns a map of destination field to value.
 * Used before euid resolution so that getFieldValue(doc, 'entity.namespace') etc. see computed values.
 *
 * @param doc - The document (flat or nested)
 * @param fieldEvaluations - List of evaluations from identityField.fieldEvaluations
 * @returns Map of destination field name to evaluated value (string or null). Omit destinations that did not match any rule (e.g. else with undefined source).
 */
export function applyFieldEvaluations(
  doc: any,
  fieldEvaluations: FieldEvaluation[]
): Record<string, string | null> {
  const result: Record<string, string | null> = {};
  for (const evaluation of fieldEvaluations) {
    const sourceValue = getSourceValue(doc, evaluation.source);
    for (const rule of evaluation.rules) {
      const value = evaluateRule(rule, sourceValue);
      if (value !== undefined) {
        result[evaluation.destination] = value;
        break;
      }
    }
  }
  return result;
}
