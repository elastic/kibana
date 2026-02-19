/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { QueryDslQueryContainer } from '@kbn/data-views-plugin/common/types';
import type { EntityType } from '../definitions/entity_schema';
import { getEntityDefinitionWithoutId } from '../definitions/registry';
import { getDocument, getFieldsToBeFilteredOn, getFieldsToBeFilteredOut } from './commons';

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
  const fieldsToBeFilteredOn = getFieldsToBeFilteredOn(doc, identityField.euidFields);
  if (fieldsToBeFilteredOn.rankingPosition === -1) {
    return undefined;
  }

  const dsl: QueryDslQueryContainer = {
    bool: {
      filter: Object.entries(fieldsToBeFilteredOn.values).map(([field, value]) => ({
        term: { [field]: value },
      })),
    },
  };

  const toBeFilteredOut = getFieldsToBeFilteredOut(identityField.euidFields, fieldsToBeFilteredOn);
  if (toBeFilteredOut.length > 0) {
    dsl.bool = {
      ...dsl.bool,
      must_not: toBeFilteredOut.map((field) => ({ exists: { field } })),
    };
  }

  return dsl;
}
