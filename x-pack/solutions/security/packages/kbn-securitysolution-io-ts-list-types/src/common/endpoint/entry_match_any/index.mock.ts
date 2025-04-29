/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ENTRY_VALUE, FIELD, MATCH_ANY, OPERATOR } from '../../../constants/index.mock';
import { EndpointEntryMatchAny } from '.';

export const getEndpointEntryMatchAnyMock = (): EndpointEntryMatchAny => ({
  field: FIELD,
  operator: OPERATOR,
  type: MATCH_ANY,
  value: [ENTRY_VALUE],
});
