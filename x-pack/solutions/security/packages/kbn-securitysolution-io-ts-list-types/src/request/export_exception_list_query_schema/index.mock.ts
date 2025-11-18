/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ID, LIST_ID, NAMESPACE_TYPE } from '../../constants/index.mock';

import type { ExportExceptionListQuerySchema } from '.';

export const getExportExceptionListQuerySchemaMock = (): ExportExceptionListQuerySchema => ({
  id: ID,
  list_id: LIST_ID,
  namespace_type: NAMESPACE_TYPE,
  include_expired_exceptions: 'true',
});
