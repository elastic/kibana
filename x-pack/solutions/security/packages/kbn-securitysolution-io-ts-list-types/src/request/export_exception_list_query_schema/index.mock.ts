/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { ID, LIST_ID, NAMESPACE_TYPE } from '../../constants/index.mock';

import { ExportExceptionListQuerySchema } from '.';

export const getExportExceptionListQuerySchemaMock = (): ExportExceptionListQuerySchema => ({
  id: ID,
  list_id: LIST_ID,
  namespace_type: NAMESPACE_TYPE,
  include_expired_exceptions: 'true',
});
