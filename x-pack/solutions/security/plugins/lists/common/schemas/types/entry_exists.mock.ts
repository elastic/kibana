/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EntryExists } from '@kbn/securitysolution-io-ts-list-types';

import { EXISTS, FIELD, OPERATOR } from '../../constants.mock';

export const getEntryExistsMock = (): EntryExists => ({
  field: FIELD,
  operator: OPERATOR,
  type: EXISTS,
});

export const getEntryExistsExcludedMock = (): EntryExists => ({
  ...getEntryExistsMock(),
  operator: 'excluded',
});
