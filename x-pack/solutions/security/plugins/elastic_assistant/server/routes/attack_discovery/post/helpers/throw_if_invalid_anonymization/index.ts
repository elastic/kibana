/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AnonymizationFieldResponse } from '@kbn/elastic-assistant-common/impl/schemas';

import * as i18n from './translations';

export const throwIfInvalidAnonymization = (
  anonymizationFields: AnonymizationFieldResponse[]
): void => {
  const idField = anonymizationFields.find((field) => field.field === '_id');

  // no fields allowed:
  if (
    anonymizationFields.length === 0 ||
    anonymizationFields.every((field) => field.allowed === false)
  ) {
    throw new Error(i18n.NO_FIELDS_ALLOWED);
  }

  // _id field NOT included, or NOT allowed:
  if (idField == null || idField.allowed === false) {
    throw new Error(i18n.ID_FIELD_REQUIRED);
  }
};
