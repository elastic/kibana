/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { get } from 'lodash';
import type { Condition } from '@kbn/streamlang';
import type {
  EntityDefinitionWithoutId,
  FieldEvaluation,
  FieldEvaluationSource,
  FieldEvaluationWhenClause,
} from '../definitions/entity_schema';
import { isSingleFieldIdentity } from '../definitions/entity_schema';
import { evaluateStreamlangCondition } from './commons';

/** Result of resolving document + field evaluation into a filter-friendly spec (no EVAL). */
export type SourceMatchSpec =
  | { type: 'unknown' }
  | { type: 'values'; values: string[] }
  | { type: 'condition'; condition: Condition };

function isSourceMatchClause(
  clause: FieldEvaluationWhenClause
): clause is { sourceMatchesAny: string[]; then: string } {
  return 'sourceMatchesAny' in clause;
}

function isConditionClause(
  clause: FieldEvaluationWhenClause
): clause is { condition: Condition; then: string } {
  return 'condition' in clause;
}

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
 * Cascade: walks `whenClauses` in definition order — sourceMatch branches first, then condition
 * branches — first match wins; if none match, uses raw `sourceValue` or `fallbackValue`.
 * Shared by applyFieldEvaluations and getSourceMatchSpec.
 */
function evaluateFieldEvaluation(
  doc: any,
  evaluation: FieldEvaluation
): { value: string | null; sourceMatchSpec: SourceMatchSpec } {
  let sourceValue: string | undefined;
  for (const source of evaluation.sources) {
    sourceValue = resolveSourceValue(doc, source);
    if (sourceValue !== undefined) {
      break;
    }
  }

  let value: string | null | undefined;
  let matchedSourceClause: { sourceMatchesAny: string[] } | undefined;
  let winningCondition: Condition | undefined;

  for (const clause of evaluation.whenClauses) {
    if (isSourceMatchClause(clause)) {
      if (sourceValue !== undefined && clause.sourceMatchesAny.includes(sourceValue)) {
        value = clause.then;
        matchedSourceClause = { sourceMatchesAny: clause.sourceMatchesAny };
        break;
      }
    } else if (isConditionClause(clause) && evaluateStreamlangCondition(doc, clause.condition)) {
      value = clause.then;
      winningCondition = clause.condition;
      break;
    }
  }

  if (value === undefined) {
    value = sourceValue === undefined ? evaluation.fallbackValue : sourceValue;
  }

  let sourceMatchSpec: SourceMatchSpec;
  if (winningCondition !== undefined) {
    sourceMatchSpec = { type: 'condition', condition: winningCondition };
  } else if (sourceValue === undefined) {
    sourceMatchSpec = { type: 'unknown' };
  } else if (matchedSourceClause !== undefined) {
    sourceMatchSpec = { type: 'values', values: matchedSourceClause.sourceMatchesAny };
  } else {
    sourceMatchSpec = { type: 'values', values: [sourceValue] };
  }

  return { value, sourceMatchSpec };
}

/**
 * Resolves the document and a single field evaluation into a source match spec for building
 * ESQL/DSL filters without EVAL. Uses the same first-source-wins and whenClause logic as
 * applyFieldEvaluations; when a sourceMatch whenClause matches, returns that clause's sourceMatchesAny
 * so the filter can match any of those source values (e.g. okta or entityanalytics_okta).
 * When a condition whenClause wins, returns { type: 'condition', condition }.
 *
 * @param doc - The document (flat or nested)
 * @param evaluation - One entry from identityField.fieldEvaluations
 * @returns SourceMatchSpec for filter construction.
 */
export function getSourceMatchSpec(doc: any, evaluation: FieldEvaluation): SourceMatchSpec {
  return evaluateFieldEvaluation(doc, evaluation).sourceMatchSpec;
}

/**
 * Applies field evaluations to a document and returns a map of destination field to value.
 * Tries sources, then walks `whenClauses` in order (sourceMatch and condition arms); first match
 * wins. If none match, uses raw source value or fallbackValue when no source.
 * Used before euid resolution so that getFieldValue(doc, 'entity.namespace') etc. see computed values.
 *
 * @param doc - The document (flat or nested)
 * @param fieldEvaluations - List of evaluations from identityField.fieldEvaluations
 * @returns Map of destination field name to evaluated value (string).
 */
export function applyFieldEvaluations(
  doc: any,
  fieldEvaluations: FieldEvaluation[]
): Record<string, string | null> {
  const result: Record<string, string | null> = {};
  for (const evaluation of fieldEvaluations) {
    const currentDoc = { ...doc, ...result };
    const { value } = evaluateFieldEvaluation(currentDoc, evaluation);
    result[evaluation.destination] = value;
  }
  return result;
}

export function getFieldEvaluationsFromDefinition(
  entityDefinition: Pick<EntityDefinitionWithoutId, 'fieldEvaluations' | 'identityField'>
): FieldEvaluation[] {
  const sharedEvaluations = entityDefinition.fieldEvaluations ?? [];
  if (isSingleFieldIdentity(entityDefinition.identityField)) {
    return sharedEvaluations;
  }

  return [...sharedEvaluations, ...(entityDefinition.identityField.fieldEvaluations ?? [])];
}

function isNotEmpty(value: string): boolean {
  return value !== undefined && value !== null && value !== '';
}
