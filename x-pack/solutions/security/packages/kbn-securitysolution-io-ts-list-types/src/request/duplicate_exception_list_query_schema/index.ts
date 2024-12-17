/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import * as t from 'io-ts';
import { NamespaceType } from '../../common';

import { includeExpiredExceptionsOrUndefined } from '../../common/include_expired_exceptions';
import { list_id } from '../../common/list_id';
import { namespace_type } from '../../common/namespace_type';

export const duplicateExceptionListQuerySchema = t.exact(
  t.type({
    list_id,
    namespace_type,
    include_expired_exceptions: includeExpiredExceptionsOrUndefined,
  })
);

export type DuplicateExceptionListQuerySchema = t.OutputOf<
  typeof duplicateExceptionListQuerySchema
>;

// This type is used after a decode since some things are defaults after a decode.
export type DuplicateExceptionListQuerySchemaDecoded = Omit<
  t.TypeOf<typeof duplicateExceptionListQuerySchema>,
  'namespace_type'
> & {
  namespace_type: NamespaceType;
};
