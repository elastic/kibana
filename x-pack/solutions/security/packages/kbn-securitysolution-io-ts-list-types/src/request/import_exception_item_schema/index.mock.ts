/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ENTRIES } from '../../constants/index.mock';
import { ImportExceptionListItemSchema, ImportExceptionListItemSchemaDecoded } from '.';

export const getImportExceptionsListItemSchemaMock = (
  itemId = 'item_id_1',
  listId = 'detection_list_id'
): ImportExceptionListItemSchema => ({
  description: 'some description',
  entries: ENTRIES,
  item_id: itemId,
  list_id: listId,
  name: 'Query with a rule id',
  type: 'simple',
});

export const getImportExceptionsListItemSchemaDecodedMock = (
  itemId = 'item_id_1',
  listId = 'detection_list_id'
): ImportExceptionListItemSchemaDecoded => ({
  ...getImportExceptionsListItemSchemaMock(itemId, listId),
  comments: [],
  meta: undefined,
  namespace_type: 'single',
  os_types: [],
  tags: [],
  expire_time: undefined,
});
