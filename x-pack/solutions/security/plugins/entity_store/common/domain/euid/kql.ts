/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { escapeQuotes } from '@kbn/es-query';
import type { FilterCondition, RangeCondition, Condition } from '@kbn/streamlang';
import {
  getFilterOperator,
  getFilterValue,
  isFilterCondition,
  isAndCondition,
  isOrCondition,
  isNotCondition,
  isAlwaysCondition,
} from '@kbn/streamlang';
import type { EntityType, FieldEvaluation } from '../definitions/entity_schema';
import { isSingleFieldIdentity } from '../definitions/entity_schema';
import { getEntityDefinitionWithoutId } from '../definitions/registry';
import {
  applyWhenConditionTrueSetFields,
  documentPassesCalculatedIdentityPipelineGate,
  getDocument,
  getEffectiveEuidRanking,
  getFieldValue,
  getFieldsToBeFilteredOn,
  getFieldsToBeFilteredOut,
  getSourceFieldNames,
} from './commons';
import type { SourceMatchSpec } from './field_evaluations';
import { applyFieldEvaluations, getSourceMatchSpec } from './field_evaluations';

/**
 * Constructs a KQL filter string matching source documents that would resolve to the same entity
 * as the provided document.
 *
 * Mirrors {@link getEuidDslFilterBasedOnDocument} but produces KQL instead of ES DSL.
 * Accepts either a raw source document or an entity store record (both flattened and nested shapes
 * are supported; `_source`-wrapped ES hits are unwrapped automatically).
 *
 * Field evaluations that produce virtual fields (e.g. `entity.namespace` derived from
 * `event.module`) are translated back to their source field KQL conditions wherever the
 * when-clause used a `sourceMatchesAny` list. Condition-based when-clauses (used for the
 * `local` namespace) are omitted — the identity fields themselves are sufficient to narrow to
 * the same entity in that case.
 *
 * @example
 * // Okta user — includes event.module condition so only okta documents match
 * getEuidKqlFilterBasedOnDocument('user', { 'user.email': 'jane@acme.com', 'entity.namespace': 'okta' })
 * // → 'user.email: "jane@acme.com" AND (event.module: "okta" OR event.module: "entityanalytics_okta" OR data_stream.dataset: okta* OR data_stream.dataset: entityanalytics_okta*)'
 *
 * @example
 * // Local user — identity fields alone are sufficient
 * getEuidKqlFilterBasedOnDocument('user', { 'user.name': 'jdoe', 'host.id': 'HW-UUID-ABC', 'entity.namespace': 'local' })
 * // → 'user.name: "jdoe" AND host.id: "HW-UUID-ABC"'
 *
 * @example
 * // Host — single-field identity, no namespace
 * getEuidKqlFilterBasedOnDocument('host', { 'host.id': 'HW-UUID-ABC123' })
 * // → 'host.id: "HW-UUID-ABC123"'
 *
 * @param entityType - The entity type ('host', 'user', 'service', 'generic')
 * @param doc - Source document or entity store record. May be flattened, nested, or an ES hit.
 * @returns A KQL filter string, or `undefined` if the document lacks sufficient identity
 *   information or fails the entity's pipeline gate.
 */
export function getEuidKqlFilterBasedOnDocument(
  entityType: EntityType,
  doc: any
): string | undefined {
  if (!doc) {
    return undefined;
  }

  doc = getDocument(doc);
  const entityDefinition = getEntityDefinitionWithoutId(entityType);
  const { identityField } = entityDefinition;

  if (isSingleFieldIdentity(identityField)) {
    const value = getFieldValue(doc, identityField.singleField);
    if (value === undefined) {
      return undefined;
    }
    return `${identityField.singleField}: "${escapeQuotes(value)}"`;
  }

  const fieldEvaluations = identityField.fieldEvaluations ?? [];
  if (fieldEvaluations.length > 0) {
    const evaluated = applyFieldEvaluations(doc, fieldEvaluations);
    doc = { ...doc, ...evaluated };
  }
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
  const fieldsToBeFilteredOn = getFieldsToBeFilteredOn(doc, effectiveRanking);
  if (fieldsToBeFilteredOn.rankingPosition === -1) {
    return undefined;
  }

  // Evaluated fields (e.g. entity.namespace from event.module) are not stored in source documents.
  // Exclude them from direct field matches; translate them to source field conditions instead.
  const evaluatedDestinations = new Set(fieldEvaluations.map((e) => e.destination));

  const conditions: string[] = Object.entries(fieldsToBeFilteredOn.values)
    .filter(([field]) => !evaluatedDestinations.has(field))
    .map(([field, value]) => `${field}: "${escapeQuotes(value)}"`);

  // Compute source match specs once, excluding evaluations whose sources are themselves evaluated.
  const evaluationSpecs = fieldEvaluations
    .filter((evaluation) => {
      const { exactMatchFields, prefixMatchFields } = getSourceFieldNames(evaluation.sources);
      return ![...exactMatchFields, ...prefixMatchFields].some((f) => evaluatedDestinations.has(f));
    })
    .map((evaluation) => ({ evaluation, spec: getSourceMatchSpec(doc, evaluation) }));

  // For condition-based namespaces (e.g. local users identified by user.name + host.id from
  // authentication events), the identity fields alone are sufficient — no higher-ranked field
  // guards or source clause needed.
  const isConditionBased = evaluationSpecs.some(({ spec }) => spec.type === 'condition');

  if (!isConditionBased) {
    const toBeFilteredOut = getFieldsToBeFilteredOut(effectiveRanking, fieldsToBeFilteredOn).filter(
      (field) => !evaluatedDestinations.has(field)
    );
    for (const field of toBeFilteredOut) {
      conditions.push(fieldMissingOrEmptyKql(field));
    }

    for (const { evaluation, spec } of evaluationSpecs) {
      const kqlClause = buildSourceClauseKql(evaluation, spec);
      if (kqlClause !== undefined) {
        conditions.push(kqlClause);
      }
    }
  }

  return conditions.length > 0 ? conditions.join(' AND ') : undefined;
}

/**
 * KQL equivalent of the DSL `fieldMissingOrEmpty` — matches documents where the field is
 * absent or equals the empty string. Mirrors the behaviour of `getFieldValue` (empty is not
 * identity) so that higher-ranked fields we skipped during EUID resolution are correctly
 * excluded from the result set.
 */
function fieldMissingOrEmptyKql(field: string): string {
  return `(NOT ${field}: * OR ${field}: "")`;
}

/**
 * Translates a field evaluation back to KQL source-field conditions using the known
 * destination value. Only `sourceMatchesAny` when-clauses can be reversed to KQL;
 * condition-based when-clauses are skipped (the identity fields are sufficient for those
 * cases, e.g. the `local` namespace).
 */
function buildSourceClauseKql(
  evaluation: FieldEvaluation,
  spec: SourceMatchSpec
): string | undefined {
  if (spec.type === 'condition') {
    return conditionToKql(spec.condition);
  }

  const { exactMatchFields, prefixMatchFields } = getSourceFieldNames(evaluation.sources);
  const allSourceFields = [...exactMatchFields, ...prefixMatchFields];

  if (spec.type === 'unknown') {
    const fieldGroups: string[] = [];
    for (const field of allSourceFields) {
      fieldGroups.push(`(NOT ${field}: * OR ${field}: "")`);
    }
    return fieldGroups.length === 0 ? undefined : `(${fieldGroups.join(' AND ')})`;
  }

  const parts: string[] = [];

  for (const v of spec.values) {
    for (const field of exactMatchFields) {
      parts.push(`${field}: "${escapeQuotes(v)}"`);
    }
    for (const field of prefixMatchFields) {
      // Prefix match: data_stream.dataset starts with v (e.g. "okta" matches "okta.logs").
      // KQL wildcards require an unquoted value; namespace source values don't contain
      // special characters so unquoted is safe here.
      parts.push(`${field}: ${v}*`);
    }
  }

  if (parts.length === 0) {
    return undefined;
  }
  return parts.length === 1 ? parts[0] : `(${parts.join(' OR ')})`;
}

function escapeKqlValue(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

function filterConditionToKql(condition: FilterCondition): string {
  const operator = getFilterOperator(condition);
  const value = getFilterValue(condition);
  const { field } = condition;

  switch (operator) {
    case 'eq':
      return `${field}: "${escapeKqlValue(String(value))}"`;
    case 'neq':
      return `NOT ${field}: "${escapeKqlValue(String(value))}"`;
    case 'exists':
      return value === true ? `${field}: *` : `NOT ${field}: *`;
    case 'gt':
      return `${field} > ${value}`;
    case 'gte':
      return `${field} >= ${value}`;
    case 'lt':
      return `${field} < ${value}`;
    case 'lte':
      return `${field} <= ${value}`;
    case 'contains':
      return `${field}: *${escapeKqlValue(String(value))}*`;
    case 'startsWith':
      return `${field}: ${escapeKqlValue(String(value))}*`;
    case 'endsWith':
      return `${field}: *${escapeKqlValue(String(value))}`;
    case 'includes':
      return `${field}: "${escapeKqlValue(String(value))}"`;
    case 'range': {
      const r = value as RangeCondition;
      const parts: string[] = [];
      if (r.gte !== undefined) parts.push(`${field} >= ${r.gte}`);
      if (r.gt !== undefined) parts.push(`${field} > ${r.gt}`);
      if (r.lte !== undefined) parts.push(`${field} <= ${r.lte}`);
      if (r.lt !== undefined) parts.push(`${field} < ${r.lt}`);
      return parts.length === 1 ? parts[0] : `(${parts.join(' AND ')})`;
    }
    default:
      return 'NOT *';
  }
}

export function conditionToKql(condition: Condition): string {
  if (isFilterCondition(condition)) {
    return filterConditionToKql(condition);
  }

  if (isAndCondition(condition)) {
    const parts = condition.and.map((c) => conditionToKql(c));
    return parts.length === 1 ? parts[0] : `(${parts.join(' AND ')})`;
  }

  if (isOrCondition(condition)) {
    const parts = condition.or.map((c) => conditionToKql(c));
    return parts.length === 1 ? parts[0] : `(${parts.join(' OR ')})`;
  }

  if (isNotCondition(condition)) {
    return `NOT ${conditionToKql(condition.not)}`;
  }

  if (isAlwaysCondition(condition)) {
    return '*';
  }

  return 'NOT *';
}
