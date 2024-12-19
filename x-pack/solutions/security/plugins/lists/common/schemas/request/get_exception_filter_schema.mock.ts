/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { GetExceptionFilterSchema } from '@kbn/securitysolution-io-ts-list-types';

import { LIST_ID, NAMESPACE_TYPE } from '../../constants.mock';
import { getExceptionListItemSchemaMock } from '../response/exception_list_item_schema.mock';

export const getExceptionFilterFromExceptionItemsSchemaMock = (): GetExceptionFilterSchema => ({
  exceptions: [getExceptionListItemSchemaMock()],
  type: 'exception_items',
});

export const getExceptionFilterFromExceptionIdsSchemaMock = (): GetExceptionFilterSchema => ({
  exception_list_ids: [{ exception_list_id: LIST_ID, namespace_type: NAMESPACE_TYPE }],
  type: 'exception_list_ids',
});
