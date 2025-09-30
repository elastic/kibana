/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { LIST_ID, TYPE } from '../../constants/index.mock';

import type { ImportListItemQuerySchema } from '.';

export const getImportListItemQuerySchemaMock = (): ImportListItemQuerySchema => ({
  deserializer: undefined,
  list_id: LIST_ID,
  serializer: undefined,
  type: TYPE,
  refresh: 'false',
});
