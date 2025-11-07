/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AnonymizationFieldResponse } from '@kbn/elastic-assistant-common/impl/schemas';

import { throwIfInvalidAnonymization } from '.';
import * as i18n from './translations';

const userNameFieldNotAllowed: AnonymizationFieldResponse = {
  allowed: false, // <-- This field is NOT allowed
  anonymized: true,
  createdAt: '2025-03-13T06:07:34.493Z',
  field: 'user.name',
  id: 'kB8djpUBwtgi0OSKhvlf',
  namespace: 'default',
  timestamp: '2025-03-13T06:07:34.493Z',
  updatedAt: '2025-03-13T20:33:58.283Z',
};

const userNameFieldAllowed: AnonymizationFieldResponse = {
  ...userNameFieldNotAllowed,
  allowed: true, // <-- the user.name field IS allowed
};

const idFieldNotAllowed: AnonymizationFieldResponse = {
  allowed: false, // <-- This field is NOT allowed
  anonymized: false,
  createdAt: '2025-03-13T20:45:41.877Z',
  field: '_id',
  id: 'TShBkZUBT8Bn3CFdeOR3',
  namespace: 'default',
  timestamp: '2025-03-13T20:45:41.877Z',
  updatedAt: '2025-03-13T20:33:58.283Z',
};

describe('throwIfInvalidAnonymization', () => {
  it('throws when the anonymizationFields are empty', () => {
    const emptyAnonymizationFields: AnonymizationFieldResponse[] = [];

    expect(() => {
      throwIfInvalidAnonymization(emptyAnonymizationFields);
    }).toThrowError(i18n.NO_FIELDS_ALLOWED);
  });

  it('throws when all fields are NOT allowed', () => {
    const anonymizationFields: AnonymizationFieldResponse[] = [
      userNameFieldNotAllowed,
      idFieldNotAllowed,
    ];

    expect(() => {
      throwIfInvalidAnonymization(anonymizationFields);
    }).toThrowError(i18n.NO_FIELDS_ALLOWED);
  });

  it('throws when the _id field is NOT included', () => {
    const idFieldNotIncluded: AnonymizationFieldResponse[] = [
      userNameFieldAllowed, // <-- at least one field is allowed
    ];

    expect(() => {
      throwIfInvalidAnonymization(idFieldNotIncluded);
    }).toThrowError(i18n.ID_FIELD_REQUIRED);
  });

  it('throws when the _id field is NOT allowed', () => {
    const anonymizationFields: AnonymizationFieldResponse[] = [
      userNameFieldAllowed, // <-- at least one field is allowed
      idFieldNotAllowed,
    ];

    expect(() => {
      throwIfInvalidAnonymization(anonymizationFields);
    }).toThrowError(i18n.ID_FIELD_REQUIRED);
  });

  it('does NOT throw when the _id field is allowed', () => {
    const idFieldAllowed: AnonymizationFieldResponse = {
      ...idFieldNotAllowed,
      allowed: true, // <-- the _id field is allowed
    };

    const anonymizationFields: AnonymizationFieldResponse[] = [
      idFieldAllowed,
      userNameFieldNotAllowed,
    ];

    expect(() => {
      throwIfInvalidAnonymization(anonymizationFields);
    }).not.toThrow();
  });
});
