/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { QueryDslQueryContainer } from '@kbn/data-views-plugin/common/types';
import { conditionToQueryDsl } from '@kbn/streamlang';
import type { EntityType, FieldEvaluation } from '../definitions/entity_schema';
import { isSingleFieldIdentity } from '../definitions/entity_schema';
import { getEntityDefinitionWithoutId } from '../definitions/registry';
import { isNotEmptyCondition } from '../definitions/common_fields';
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
import {
  applyFieldEvaluations,
  getSourceMatchSpec,
  type SourceMatchSpec,
} from './field_evaluations';

/**
 * Returns a DSL filter that matches documents considered for the given entity type.
 *
 * This is the DSL equivalent of {@link getEuidEsqlDocumentsContainsIdFilter}.
 * Use it to pre-filter searches/aggregations to only documents that could
 * resolve to an entity of the requested type.
 *
 * @example
 * ```ts
 * const filter = getEuidDslDocumentsContainsIdFilter('host');
 * // documentsFilter for host is or(isNotEmpty × 4), so filter is e.g.:
 * // { bool: { should: [ { bool: { must: [ ... ] } }, ... ], minimum_should_match: 1 } }
 * ```
 */
export function getEuidDslDocumentsContainsIdFilter(
  entityType: EntityType
): QueryDslQueryContainer {
  const entityDefinition = getEntityDefinitionWithoutId(entityType);
  const { identityField } = entityDefinition;
  if (isSingleFieldIdentity(identityField)) {
    return conditionToQueryDsl(
      isNotEmptyCondition(identityField.singleField)
    ) as QueryDslQueryContainer;
  }
  return conditionToQueryDsl(identityField.documentsFilter) as QueryDslQueryContainer;
}

/**
 * Constructs an Elasticsearch DSL filter for the provided entity type and document.
 *
 * It supports both flattened and nested document shapes.
 * If a document contains `_source` property, it will be unwrapped before processing.
 *
 * Example usage:
 * ```ts
 * import { getEuidDslFilterBasedOnDocument } from './dsl';
 *
 * const doc = { host: { name: 'server1', domain: 'example.com' } };
 * const filter = getEuidDslFilterBasedOnDocument('host', doc);
 * // filter may look like:
 * // {
 * //   bool: {
 * //     filter: [
 * //       { term: { 'host.name': 'server1' } },
 * //       { term: { 'host.domain': 'example.com' } }
 * //     ],
 * //     must: [
 * //       { bool: { should: [ { bool: { must_not: [{ exists: { field: 'host.id' } }] } }, { term: { 'host.id': '' } } ], minimum_should_match: 1 } },
 * //       ...
 * //     ]
 * //   }
 * // }
 * ```
 *
 * @param entityType - The entity type string (e.g. 'host', 'user', 'generic')
 * @param doc - The document to derive entity filter fields from. May be a flattened or nested shape.
 * @returns An Elasticsearch DSL query container, or `undefined` if the document does not contain enough
 *   identifying information, or if it would not pass the entity's `documentsFilter` ∧ `postAggFilter`
 *   (same gate as `getEuidDslDocumentsContainsIdFilter` / logs extraction) after field evaluations
 *   and `whenConditionTrueSetFieldsPreAgg`.
 */
export function getEuidDslFilterBasedOnDocument(
  entityType: EntityType,
  doc: any
): QueryDslQueryContainer | undefined {
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
    return {
      bool: {
        filter: [{ term: { [identityField.singleField]: value } }],
      },
    };
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

  // Evaluated fields (e.g. entity.namespace from event.module) are computed in memory and are not
  // stored in the index. Including them in the query would make it never match real documents.
  const evaluatedDestinations = new Set(fieldEvaluations.map((e) => e.destination));

  const filterValues = Object.entries(fieldsToBeFilteredOn.values).filter(
    ([field]) => !evaluatedDestinations.has(field)
  );
  const dsl: QueryDslQueryContainer = {
    bool: {
      filter: filterValues.map(([field, value]) => ({
        term: { [field]: value },
      })),
    },
  };
  const boolQuery = dsl.bool!;

  // Compute source match specs once, excluding evaluations whose sources are themselves evaluated.
  const evaluationSpecs = fieldEvaluations
    .filter((evaluation) => {
      const { exactMatchFields, prefixMatchFields } = getSourceFieldNames(evaluation.sources);
      return ![...exactMatchFields, ...prefixMatchFields].some((f) => evaluatedDestinations.has(f));
    })
    .map((evaluation) => ({ evaluation, spec: getSourceMatchSpec(doc, evaluation) }));

  // Field guards (higher-ranked field exclusions from EUID ranking) are only needed when the
  // namespace is source-value-based. Condition-based namespaces (e.g. local, cloud.provider
  // mapping) skip the guards because the condition itself is the discriminator.
  const isConditionBased = evaluationSpecs.some(({ spec }) => spec.type === 'condition');

  if (!isConditionBased) {
    const toBeFilteredOut = getFieldsToBeFilteredOut(effectiveRanking, fieldsToBeFilteredOn).filter(
      (field) => !evaluatedDestinations.has(field)
    );
    if (toBeFilteredOut.length > 0) {
      const priorMust = Array.isArray(boolQuery.must) ? boolQuery.must : [];
      dsl.bool = {
        ...boolQuery,
        must: [...priorMust, ...toBeFilteredOut.map(fieldMissingOrEmptyDsl)],
      };
    }
  }

  // Source clauses are always added regardless of isConditionBased.
  // For condition specs (e.g. local namespace or cloud.provider field-mapping), buildSourceClauseDsl
  // translates the condition to DSL via conditionToQueryDsl — this ensures that a filter for
  // user:alice@aws also requires cloud.provider==aws and does not accidentally match alice@gcp.
  const currentBoolQuery = dsl.bool!;
  const filterList = Array.isArray(currentBoolQuery.filter) ? currentBoolQuery.filter : [];
  for (const { evaluation, spec } of evaluationSpecs) {
    filterList.push(buildSourceClauseDsl(evaluation, spec) as QueryDslQueryContainer);
  }
  dsl.bool = { ...dsl.bool, filter: filterList };

  return dsl;
}

/**
 * Constructs an Elasticsearch DSL filter for the provided entity type from an already-resolved
 * entity-store record (not a raw source document).
 *
 * This is the counterpart of {@link getEuidDslFilterBasedOnDocument} for entity-store records.
 * The difference matters for entity types with field evaluations (e.g. `user`, whose
 * `entity.namespace` is derived from `event.module` / `data_stream.dataset`): an entity-store
 * record does NOT retain those source fields, so re-deriving the namespace from the record would
 * collapse it to the fallback and the resulting IdP source clause would match no documents.
 * Instead, this function trusts the record's already-resolved evaluated fields (e.g.
 * `entity.namespace`) and reverse-maps them back to the raw source-field conditions that produce
 * them (see {@link buildResolvedEvaluationSourceClause}).
 *
 * Single-field identities (service, generic) and calculated identities without field evaluations
 * (host) carry their raw identity fields directly on the record, so this delegates to
 * {@link getEuidDslFilterBasedOnDocument}.
 *
 * @param entityType - The entity type string (e.g. 'host', 'user', 'generic')
 * @param record - The entity-store record (host/user/service). May be a flattened or nested shape.
 * @returns An Elasticsearch DSL query container, or `undefined` if the record does not contain
 *   enough identifying information.
 */
export function getEuidDslFilterBasedOnEntityRecord(
  entityType: EntityType,
  record: any
): QueryDslQueryContainer | undefined {
  if (!record) {
    return undefined;
  }

  const doc = getDocument(record);
  const entityDefinition = getEntityDefinitionWithoutId(entityType);
  const { identityField } = entityDefinition;

  if (isSingleFieldIdentity(identityField) || !identityField.fieldEvaluations?.length) {
    return getEuidDslFilterBasedOnDocument(entityType, record);
  }

  const fieldEvaluations = identityField.fieldEvaluations;
  const evaluatedDestinations = new Set(
    fieldEvaluations.map((evaluation) => evaluation.destination)
  );

  const effectiveRanking = getEffectiveEuidRanking(doc, identityField);
  const fieldsToBeFilteredOn = getFieldsToBeFilteredOn(doc, effectiveRanking);
  if (fieldsToBeFilteredOn.rankingPosition === -1) {
    return undefined;
  }

  const filter: QueryDslQueryContainer[] = Object.entries(fieldsToBeFilteredOn.values)
    .filter(([field]) => !evaluatedDestinations.has(field))
    .map(([field, value]) => ({ term: { [field]: value } }));

  for (const evaluation of fieldEvaluations) {
    const resolvedValue = getFieldValue(doc, evaluation.destination);
    if (resolvedValue === undefined) {
      continue;
    }
    const sourceClause = buildResolvedEvaluationSourceClause(evaluation, resolvedValue);
    if (sourceClause) {
      filter.push(sourceClause);
    }
  }

  const dsl: QueryDslQueryContainer = { bool: { filter } };

  const toBeFilteredOut = getFieldsToBeFilteredOut(effectiveRanking, fieldsToBeFilteredOn).filter(
    (field) => !evaluatedDestinations.has(field)
  );
  if (toBeFilteredOut.length > 0) {
    dsl.bool!.must = toBeFilteredOut.map(fieldMissingOrEmptyDsl);
  }

  return dsl;
}

/**
 * Builds a DSL clause that matches raw source documents whose evaluated field (e.g.
 * `entity.namespace`) would resolve to `resolvedValue`, by walking the field-evaluation
 * `whenClauses` in reverse.
 *
 * Unlike the source-reading path used by {@link getEuidDslFilterBasedOnDocument}, this trusts the
 * already-resolved value and OR-s together every whenClause arm that yields it:
 * - `sourceMatchesAny` arms -> term/prefix on the source fields for each listed source value.
 * - string-condition arms (e.g. the `local` gate) -> the condition translated via `conditionToQueryDsl`.
 * - field-mapping arms (e.g. asset_discovery `cloud.provider` -> namespace) -> the arm condition
 *   AND an equality on the specific source key that maps to `resolvedValue`.
 *
 * When no arm produces the value it is either the evaluation fallback (source fields absent) or a
 * pass-through raw source value, handled accordingly.
 */
function buildResolvedEvaluationSourceClause(
  evaluation: FieldEvaluation,
  resolvedValue: string
): QueryDslQueryContainer | undefined {
  const shoulds: QueryDslQueryContainer[] = [];
  for (const clause of evaluation.whenClauses) {
    if ('sourceMatchesAny' in clause) {
      if (clause.then === resolvedValue) {
        shoulds.push(
          buildSourceClauseDsl(evaluation, { type: 'values', values: clause.sourceMatchesAny })
        );
      }
      continue;
    }
    if (typeof clause.then === 'string') {
      if (clause.then === resolvedValue) {
        shoulds.push(conditionToQueryDsl(clause.condition) as QueryDslQueryContainer);
      }
      continue;
    }
    const fieldMappingThen = clause.then;
    for (const [sourceKey, mappedValue] of Object.entries(fieldMappingThen.mapping)) {
      if (mappedValue === resolvedValue) {
        shoulds.push(
          conditionToQueryDsl({
            and: [clause.condition, { field: fieldMappingThen.field, eq: sourceKey }],
          }) as QueryDslQueryContainer
        );
      }
    }
  }

  if (shoulds.length === 1) {
    return shoulds[0];
  }
  if (shoulds.length > 1) {
    return { bool: { should: shoulds, minimum_should_match: 1 } };
  }

  // No whenClause produces this value: it is either the evaluation fallback (source fields
  // absent) or a pass-through raw source value.
  if (resolvedValue === evaluation.fallbackValue) {
    const { exactMatchFields, prefixMatchFields } = getSourceFieldNames(evaluation.sources);
    if (exactMatchFields.length === 0 && prefixMatchFields.length === 0) {
      return undefined;
    }
    return buildSourceClauseDsl(evaluation, { type: 'unknown' });
  }
  return buildSourceClauseDsl(evaluation, { type: 'values', values: [resolvedValue] });
}

/**
 * Document matches when the field is missing or equals "" — aligned with getFieldValue (empty is not
 * identity) and ESQL `esqlIsNullOrEmpty` for higher-ranked fields we skipped.
 */
function fieldMissingOrEmptyDsl(field: string): QueryDslQueryContainer {
  return {
    bool: {
      should: [{ bool: { must_not: [{ exists: { field } }] } }, { term: { [field]: '' } }],
      minimum_should_match: 1,
    },
  };
}

/**
 * Translates a field evaluation back to DSL source-field conditions using the known destination
 * value. For condition-based when-clauses the condition is translated directly to DSL via
 * `conditionToQueryDsl`, ensuring provider-specific filters (e.g. `cloud.provider == "aws"`)
 * are included and not accidentally omitted.
 */
function buildSourceClauseDsl(
  evaluation: FieldEvaluation,
  spec: SourceMatchSpec
): QueryDslQueryContainer {
  if (spec.type === 'condition') {
    return conditionToQueryDsl(spec.condition) as QueryDslQueryContainer;
  }

  const { exactMatchFields, prefixMatchFields } = getSourceFieldNames(evaluation.sources);
  const allSourceFields = [...exactMatchFields, ...prefixMatchFields];

  if (spec.type === 'unknown') {
    return {
      bool: {
        must: allSourceFields.map((field) => fieldMissingOrEmptyDsl(field)),
      },
    };
  }

  const should: QueryDslQueryContainer[] = [];
  for (const v of spec.values) {
    for (const field of exactMatchFields) {
      should.push({ term: { [field]: v } });
    }
    for (const field of prefixMatchFields) {
      should.push({ prefix: { [field]: v } });
    }
  }
  return {
    bool: {
      should,
      minimum_should_match: 1,
    },
  };
}
