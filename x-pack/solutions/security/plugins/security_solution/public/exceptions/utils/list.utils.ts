/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ExceptionListSchema } from '@kbn/securitysolution-io-ts-list-types';
import { exceptionListSchema } from '@kbn/securitysolution-io-ts-list-types';

import { listIDsCannotBeEdited } from '../config';

export const checkIfListCannotBeEdited = (list: ExceptionListSchema) => {
  return !!listIDsCannotBeEdited.find((id) => id === list.list_id);
};
export const isAnExceptionListItem = (list: ExceptionListSchema) => {
  return exceptionListSchema.is(list);
};
