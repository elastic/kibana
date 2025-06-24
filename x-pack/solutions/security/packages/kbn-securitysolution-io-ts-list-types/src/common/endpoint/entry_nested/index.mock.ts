/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EndpointEntryNested } from '.';
import { FIELD, NESTED } from '../../../constants/index.mock';
import { getEndpointEntryMatchMock } from '../entry_match/index.mock';
import { getEndpointEntryMatchAnyMock } from '../entry_match_any/index.mock';

export const getEndpointEntryNestedMock = (): EndpointEntryNested => ({
  entries: [getEndpointEntryMatchMock(), getEndpointEntryMatchAnyMock()],
  field: FIELD,
  type: NESTED,
});
