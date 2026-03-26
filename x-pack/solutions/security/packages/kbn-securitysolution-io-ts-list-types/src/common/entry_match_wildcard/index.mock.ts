/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EntryMatchWildcard } from '.';
import { ENTRY_VALUE, FIELD, OPERATOR, WILDCARD } from '../../constants/index.mock';

export const getEntryMatchWildcardMock = (): EntryMatchWildcard => ({
  field: FIELD,
  operator: OPERATOR,
  type: WILDCARD,
  value: ENTRY_VALUE,
});

export const getEntryMatchWildcardExcludeMock = (): EntryMatchWildcard => ({
  ...getEntryMatchWildcardMock(),
  operator: 'excluded',
});
