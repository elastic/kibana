/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EntryList } from '@kbn/securitysolution-io-ts-list-types';

import { FIELD, LIST, LIST_ID, OPERATOR, TYPE } from '../../constants.mock';

export const getEntryListMock = (): EntryList => ({
  field: FIELD,
  list: { id: LIST_ID, type: TYPE },
  operator: OPERATOR,
  type: LIST,
});

export const getEntryListExcludedMock = (): EntryList => ({
  field: FIELD,
  list: { id: LIST_ID, type: TYPE },
  operator: 'excluded',
  type: LIST,
});
