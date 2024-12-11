/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { LIST_ID, LIST_ITEM_ID, META, VALUE } from '../../constants/index.mock';

import { CreateListItemSchema } from '.';

export const getCreateListItemSchemaMock = (): CreateListItemSchema => ({
  id: LIST_ITEM_ID,
  list_id: LIST_ID,
  meta: META,
  value: VALUE,
});

/**
 * Useful for end to end testing
 */
export const getCreateMinimalListItemSchemaMock = (): CreateListItemSchema => ({
  id: LIST_ITEM_ID,
  list_id: LIST_ID,
  value: VALUE,
});

/**
 * Useful for end to end testing
 */
export const getCreateMinimalListItemSchemaMockWithoutId = (): CreateListItemSchema => ({
  list_id: LIST_ID,
  value: VALUE,
});
