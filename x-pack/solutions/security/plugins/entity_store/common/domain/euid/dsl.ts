/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { QueryDslQueryContainer } from '@kbn/data-views-plugin/common/types';
import type { EntityType } from '../definitions/entity_schema';
import { getEntityDefinitionWithoutId } from '../definitions/registry';
import { getFieldsToBeFilteredOn, getFieldsToBeFilteredOut } from './commons';

export function getEuidDslFilterBasedOnDocument(
  entityType: EntityType,
  doc: any
): QueryDslQueryContainer | undefined {
  if (!doc) {
    return undefined;
  }

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
