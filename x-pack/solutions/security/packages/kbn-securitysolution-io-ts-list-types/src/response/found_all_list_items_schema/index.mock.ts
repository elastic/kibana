/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FoundAllListItemsSchema } from '.';
import { getListItemResponseMock } from '../list_item_schema/index.mock';

export const getFoundAllListItemsSchemaMock = (): FoundAllListItemsSchema => ({
  data: [getListItemResponseMock()],
  total: 1,
});
