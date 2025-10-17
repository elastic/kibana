/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ENTRY_VALUE, FIELD, OPERATOR, WILDCARD } from '../../../constants/index.mock';
import type { EndpointEntryMatchWildcard } from '.';

export const getEndpointEntryMatchWildcardMock = (): EndpointEntryMatchWildcard => ({
  field: FIELD,
  operator: OPERATOR,
  type: WILDCARD,
  value: ENTRY_VALUE,
});
