/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FoundExceptionListSchema } from '@kbn/securitysolution-io-ts-list-types';

import { getExceptionListSchemaMock } from './exception_list_schema.mock';

export const getFoundExceptionListSchemaMock = (): FoundExceptionListSchema => ({
  data: [getExceptionListSchemaMock()],
  page: 1,
  per_page: 20,
  total: 1,
});
