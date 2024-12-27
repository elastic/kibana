/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FoundListItemSchema } from '.';
import { getListItemResponseMock } from '../list_item_schema/index.mock';

export const getFoundListItemSchemaMock = (): FoundListItemSchema => ({
  cursor: 'WzI1LFsiNmE3NmI2OWQtODBkZi00YWIyLThjM2UtODVmNDY2YjA2YTBlIl1d',
  data: [getListItemResponseMock()],
  page: 1,
  per_page: 25,
  total: 1,
});
