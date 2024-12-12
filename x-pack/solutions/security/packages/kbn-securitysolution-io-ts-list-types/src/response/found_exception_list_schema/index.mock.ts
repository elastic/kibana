/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FoundExceptionListSchema } from '.';
import { getExceptionListSchemaMock } from '../exception_list_schema/index.mock';

export const getFoundExceptionListSchemaMock = (): FoundExceptionListSchema => ({
  data: [getExceptionListSchemaMock()],
  page: 1,
  per_page: 1,
  total: 1,
});
