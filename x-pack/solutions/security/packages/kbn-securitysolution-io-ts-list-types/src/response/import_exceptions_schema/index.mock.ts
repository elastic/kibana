/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ImportExceptionsResponseSchema } from '.';

export const getImportExceptionsResponseSchemaMock = (
  success = 0,
  lists = 0,
  items = 0
): ImportExceptionsResponseSchema => ({
  errors: [],
  success: true,
  success_count: success,
  success_exception_lists: true,
  success_count_exception_lists: lists,
  success_exception_list_items: true,
  success_count_exception_list_items: items,
});
