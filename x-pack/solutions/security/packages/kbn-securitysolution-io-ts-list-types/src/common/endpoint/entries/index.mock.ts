/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EndpointEntriesArray } from '.';
import { getEndpointEntryMatchMock } from '../entry_match/index.mock';
import { getEndpointEntryMatchAnyMock } from '../entry_match_any/index.mock';
import { getEndpointEntryNestedMock } from '../entry_nested/index.mock';
import { getEndpointEntryMatchWildcardMock } from '../entry_match_wildcard/index.mock';

export const getEndpointEntriesArrayMock = (): EndpointEntriesArray => [
  getEndpointEntryMatchMock(),
  getEndpointEntryMatchAnyMock(),
  getEndpointEntryNestedMock(),
  getEndpointEntryMatchWildcardMock(),
];
