/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EntryMatchAny } from '@kbn/securitysolution-io-ts-list-types';

import { ENTRY_VALUE, FIELD, MATCH_ANY, OPERATOR } from '../../constants.mock';

export const getEntryMatchAnyMock = (): EntryMatchAny => ({
  field: FIELD,
  operator: OPERATOR,
  type: MATCH_ANY,
  value: [ENTRY_VALUE],
});

export const getEntryMatchAnyExcludeMock = (): EntryMatchAny => ({
  ...getEntryMatchAnyMock(),
  operator: 'excluded',
  value: [ENTRY_VALUE, 'some other host name'],
});
