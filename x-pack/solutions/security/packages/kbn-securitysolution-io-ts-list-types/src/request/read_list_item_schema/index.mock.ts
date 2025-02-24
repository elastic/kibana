/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { LIST_ID, LIST_ITEM_ID, VALUE } from '../../constants/index.mock';

import { ReadListItemSchema } from '.';

export const getReadListItemSchemaMock = (): ReadListItemSchema => ({
  id: LIST_ITEM_ID,
  list_id: LIST_ID,
  value: VALUE,
});
