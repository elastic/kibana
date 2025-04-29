/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EndpointEntryMatch } from '.';
import { ENTRY_VALUE, FIELD, MATCH, OPERATOR } from '../../../constants/index.mock';

export const getEndpointEntryMatchMock = (): EndpointEntryMatch => ({
  field: FIELD,
  operator: OPERATOR,
  type: MATCH,
  value: ENTRY_VALUE,
});
