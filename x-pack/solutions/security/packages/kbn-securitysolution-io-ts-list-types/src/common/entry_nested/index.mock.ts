/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EntryNested } from '.';
import { NESTED, NESTED_FIELD } from '../../constants/index.mock';
import { getEntryExistsMock } from '../entries_exist/index.mock';
import { getEntryMatchExcludeMock, getEntryMatchMock } from '../entry_match/index.mock';
import { getEntryMatchAnyExcludeMock, getEntryMatchAnyMock } from '../entry_match_any/index.mock';

export const getEntryNestedMock = (): EntryNested => ({
  entries: [getEntryMatchMock(), getEntryMatchAnyMock()],
  field: NESTED_FIELD,
  type: NESTED,
});

export const getEntryNestedExcludeMock = (): EntryNested => ({
  ...getEntryNestedMock(),
  entries: [getEntryMatchExcludeMock(), getEntryMatchAnyExcludeMock()],
});

export const getEntryNestedMixedEntries = (): EntryNested => ({
  ...getEntryNestedMock(),
  entries: [getEntryMatchMock(), getEntryMatchAnyExcludeMock(), getEntryExistsMock()],
});
