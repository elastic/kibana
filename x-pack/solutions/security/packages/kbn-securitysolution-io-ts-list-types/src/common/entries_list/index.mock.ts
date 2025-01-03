/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EntryList } from '.';
import { FIELD, LIST, LIST_ID, OPERATOR, TYPE } from '../../constants/index.mock';

export const getEntryListMock = (): EntryList => ({
  field: FIELD,
  list: { id: LIST_ID, type: TYPE },
  operator: OPERATOR,
  type: LIST,
});
