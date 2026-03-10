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
  getDocument,
  getFieldValue,
  getFieldsToBeFilteredOn,
  getFieldsToBeFilteredOut,
} from './commons';
import { applyFieldEvaluations } from './field_evaluations';

/**
 * Returns a DSL filter that matches documents considered for the given entity type.
 * This is the translation of {@link CalculatedEntityIdentity.documentsFilter}.
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
  const { identityField } = getEntityDefinitionWithoutId(entityType);
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
 * //     must_not: [
 * //       { exists: { field: 'host.entity.id' } }, ...
 * //     ]
 * //   }
 * // }
 * ```
 *
 * @param entityType - The entity type string (e.g. 'host', 'user', 'generic')
 * @param doc - The document to derive entity filter fields from. May be a flattened or nested shape.
 * @returns An Elasticsearch DSL query container, or undefined if the document does not contain enough identifying information.
 */
export function getEuidDslFilterBasedOnDocument(
  entityType: EntityType,
  doc: any
): QueryDslQueryContainer | undefined {
  if (!doc) {
    return undefined;
  }

  doc = getDocument(doc);
  const { identityField } = getEntityDefinitionWithoutId(entityType);

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
  const fieldsToBeFilteredOn = getFieldsToBeFilteredOn(doc, identityField.euidFields);
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

  const toBeFilteredOut = getFieldsToBeFilteredOut(
    identityField.euidFields,
    fieldsToBeFilteredOn
  ).filter((field) => !evaluatedDestinations.has(field));
  if (toBeFilteredOut.length > 0) {
    dsl.bool = {
      ...dsl.bool,
      must_not: toBeFilteredOut.map((field) => ({ exists: { field } })),
    };
  }

  return dsl;
}
