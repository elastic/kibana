/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { LIST_ID, NAMESPACE_TYPE } from '../../constants/index.mock';

import type { DuplicateExceptionListQuerySchema } from '.';

export const getDuplicateExceptionListQuerySchemaMock = (): DuplicateExceptionListQuerySchema => ({
  list_id: LIST_ID,
  namespace_type: NAMESPACE_TYPE,
  include_expired_exceptions: 'true',
});
