/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as t from 'io-ts';

import { NamespaceType } from '../../common/default_namespace';
import { RequiredKeepUndefined } from '../../common/required_keep_undefined';
import { id } from '../../common/id';
import { list_id } from '../../common/list_id';
import { namespace_type } from '../../common/namespace_type';

export const deleteExceptionListSchema = t.exact(
  t.partial({
    id,
    list_id,
    namespace_type, // defaults to 'single' if not set during decode
  })
);

export type DeleteExceptionListSchema = t.OutputOf<typeof deleteExceptionListSchema>;

// This type is used after a decode since some things are defaults after a decode.
export type DeleteExceptionListSchemaDecoded = Omit<
  RequiredKeepUndefined<t.TypeOf<typeof deleteExceptionListSchema>>,
  'namespace_type'
> & {
  namespace_type: NamespaceType;
};
