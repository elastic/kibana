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
  FieldEvaluationWhenClauseFieldMappingThen,
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
): clause is { condition: Condition; then: string | FieldEvaluationWhenClauseFieldMappingThen } {
  return 'condition' in clause;
}

/**
 * Narrows `then` to the field-mapping variant (`{ field, mapping }`).
 * The alternative is a plain string literal, which needs no further resolution.
 */
function isFieldMappingThen(
  then: string | FieldEvaluationWhenClauseFieldMappingThen
): then is FieldEvaluationWhenClauseFieldMappingThen {
  return typeof then === 'object';
}

/**
 * Resolves the `then` clause of a condition-based when-clause against `doc`.
 *
 * - String literal: returned immediately as `{ value }`.
 * - Field-mapping (`{ field, mapping }`): reads `doc[then.field]`, looks it up in `mapping`,
 *   and returns `{ value: mappedTo, matchedKey: rawFieldValue }`.  `matchedKey` is the raw
 *   source field value (e.g. `"aws"`) and is carried back to `buildEvaluationSourceMatchSpec`
 *   so it can synthesize a compound condition that pins the exact provider that was matched.
 * - Returns `undefined` when the field is absent or its value is not in the mapping, which
 *   causes `matchFirstWhenClause` to skip this clause and try the next one.
 */
function resolveConditionThen(
  then: string | FieldEvaluationWhenClauseFieldMappingThen,
  doc: any
): { value: string; matchedKey?: string } | undefined {
  if (!isFieldMappingThen(then)) return { value: then };
  const raw = getFieldValue(doc, then.field);
  if (!raw) return undefined;
  const mapped = then.mapping[raw];
  if (mapped === undefined) return undefined;
  return { value: mapped, matchedKey: raw };
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

/** First resolved string from `sources`, in definition order. */
function readRawValueFromSources(doc: any, sources: FieldEvaluationSource[]): string | undefined {
  for (const source of sources) {
    const candidate = resolveSourceValue(doc, source);
    if (candidate !== undefined) {
      return candidate;
    }
  }
  return undefined;
}

/** First `whenClause` that applies to this document, in definition order. */
function matchFirstWhenClause(
  doc: any,
  rawValueFromSources: string | undefined,
  whenClauses: FieldEvaluationWhenClause[]
) {
  for (const clause of whenClauses) {
    if (isSourceMatchClause(clause)) {
      if (
        rawValueFromSources !== undefined &&
        clause.sourceMatchesAny.includes(rawValueFromSources)
      ) {
        return { then: clause.then, matchedSourceValues: clause.sourceMatchesAny };
      }
    } else if (isConditionClause(clause) && evaluateStreamlangCondition(doc, clause.condition)) {
      const resolved = resolveConditionThen(clause.then, doc);
      if (resolved !== undefined) {
        const fieldMappingMatch =
          isFieldMappingThen(clause.then) && resolved.matchedKey !== undefined
            ? { field: clause.then.field, matchedKey: resolved.matchedKey }
            : undefined;
        return { then: resolved.value, winningCondition: clause.condition, fieldMappingMatch };
      }
    }
  }
  return undefined;
}

/** Destination field value after applying optional when-clause override. */
function resolveFinalFieldValue(
  rawValueFromSources: string | undefined,
  fallbackValue: string | null,
  whenMatch: { then: string } | undefined
): string | null {
  if (whenMatch !== undefined) {
    return whenMatch.then;
  }
  return rawValueFromSources === undefined ? fallbackValue : rawValueFromSources;
}

/**
 * Builds the `SourceMatchSpec` that DSL/KQL/ESQL filter builders use to narrow results to
 * documents that would resolve to the same entity — without re-evaluating the document.
 *
 * Condition-based specs:
 * - If the winning when-clause was a plain condition, the spec is `{ type: 'condition', condition }`.
 * - If it was a field-mapping (`{ field, mapping }`), the spec wraps the outer condition in an
 *   `and` with an equality check on the specific field value that was matched (e.g.
 *   `cloud.provider == "aws"`).  This prevents a filter built for `user:alice@aws` from also
 *   matching `user:alice@gcp` documents.
 *
 * Source-value-based specs:
 * - `{ type: 'values', values }` when the source value or `sourceMatchesAny` list is known.
 * - `{ type: 'unknown' }` when no source value was found (generates "field missing or empty" guards).
 */
function buildEvaluationSourceMatchSpec(
  rawValueFromSources: string | undefined,
  whenMatch:
    | {
        winningCondition?: Condition;
        matchedSourceValues?: string[];
        fieldMappingMatch?: { field: string; matchedKey: string };
      }
    | undefined
): SourceMatchSpec {
  if (whenMatch?.winningCondition !== undefined) {
    const condition: Condition =
      whenMatch.fieldMappingMatch !== undefined
        ? {
            and: [
              whenMatch.winningCondition,
              {
                field: whenMatch.fieldMappingMatch.field,
                eq: whenMatch.fieldMappingMatch.matchedKey,
              },
            ],
          }
        : whenMatch.winningCondition;
    return { type: 'condition', condition };
  }
  if (rawValueFromSources === undefined) {
    return { type: 'unknown' };
  }
  if (whenMatch?.matchedSourceValues !== undefined) {
    return { type: 'values', values: whenMatch.matchedSourceValues };
  }
  return { type: 'values', values: [rawValueFromSources] };
}

/** Applies one field evaluation: sources, when-clauses, value + filter spec. */
function evaluateFieldEvaluation(
  doc: any,
  evaluation: FieldEvaluation
): { value: string | null; sourceMatchSpec: SourceMatchSpec } {
  const rawValueFromSources = readRawValueFromSources(doc, evaluation.sources);
  const whenMatch = matchFirstWhenClause(doc, rawValueFromSources, evaluation.whenClauses);

  return {
    value: resolveFinalFieldValue(rawValueFromSources, evaluation.fallbackValue, whenMatch),
    sourceMatchSpec: buildEvaluationSourceMatchSpec(rawValueFromSources, whenMatch),
  };
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

/**
 * Returns the top-level (shared) field evaluations for an entity definition —
 * e.g. `entity.source`, which applies to all entity types regardless of identity.
 * These are NOT identity-specific: they do not feed directly into the EUID expression.
 *
 * For identity-specific evaluations (e.g. `entity.namespace` for user), use
 * {@link getIdentityFieldEvaluationsFromDefinition}.
 */
export function getFieldEvaluationsFromDefinition(
  entityDefinition: Pick<EntityDefinitionWithoutId, 'fieldEvaluations' | 'identityField'>
): FieldEvaluation[] {
  return entityDefinition.fieldEvaluations ?? [];
}

/**
 * Returns the identity-specific field evaluations from `identityField.fieldEvaluations` —
 * e.g. `entity.namespace` for user, which is a direct prerequisite of the EUID expression.
 * Returns an empty array for single-field identities (generic, service, host).
 */
export function getIdentityFieldEvaluationsFromDefinition(
  entityDefinition: Pick<EntityDefinitionWithoutId, 'identityField'>
): FieldEvaluation[] {
  if (isSingleFieldIdentity(entityDefinition.identityField)) {
    return [];
  }
  return entityDefinition.identityField.fieldEvaluations ?? [];
}

function isNotEmpty(value: string): boolean {
  return value !== undefined && value !== null && value !== '';
}
