/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { QueryDslQueryContainer } from '@kbn/data-views-plugin/common/types';
import { conditionToQueryDsl } from '@kbn/streamlang';
import type { EntityType } from '../definitions/entity_schema';
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
  mergeDocumentsFilterAndPostAgg,
} from './commons';
import {
  applyFieldEvaluations,
  getSourceMatchSpec,
  type SourceMatchSpec,
} from './field_evaluations';
import type { FieldEvaluation } from '../definitions/entity_schema';

/**
 * Returns a DSL filter that matches documents considered for the given entity type.
 * Combines documentsFilter and postAggFilter (when present) so the filter is
 * equivalent to the ESQL extraction logic: only IDP or non-IDP documents pass.
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
  return conditionToQueryDsl(
    mergeDocumentsFilterAndPostAgg(identityField.documentsFilter, entityDefinition.postAggFilter)
  ) as QueryDslQueryContainer;
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

  if (identityField.fieldEvaluations?.length) {
    const evaluated = applyFieldEvaluations(doc, identityField.fieldEvaluations);
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
  const evaluatedDestinations = new Set(
    identityField.fieldEvaluations?.map((e) => e.destination) ?? []
  );

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

  const toBeFilteredOut = getFieldsToBeFilteredOut(effectiveRanking, fieldsToBeFilteredOn).filter(
    (field) => !evaluatedDestinations.has(field)
  );
  if (toBeFilteredOut.length > 0) {
    const priorMust = Array.isArray(dsl.bool?.must) ? dsl.bool.must : [];
    dsl.bool = {
      ...dsl.bool,
      must: [...priorMust, ...toBeFilteredOut.map(fieldMissingOrEmptyDsl)],
    };
  }

  if (identityField.fieldEvaluations?.length) {
    const filterList = Array.isArray(dsl.bool?.filter) ? dsl.bool.filter : [];
    for (const evaluation of identityField.fieldEvaluations) {
      const { exactMatchFields, prefixMatchFields } = getSourceFieldNames(evaluation.sources);
      const sourceFields = [...exactMatchFields, ...prefixMatchFields];
      const hasEvaluatedSource = sourceFields.some((f) => evaluatedDestinations.has(f));
      if (hasEvaluatedSource) {
        continue;
      }
      const spec = getSourceMatchSpec(doc, evaluation);
      filterList.push(buildSourceClauseDsl(evaluation, spec) as QueryDslQueryContainer);
    }
    dsl.bool = { ...dsl.bool, filter: filterList };
  }

  return dsl;
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

function buildSourceClauseDsl(
  evaluation: FieldEvaluation,
  spec: SourceMatchSpec
): QueryDslQueryContainer {
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
