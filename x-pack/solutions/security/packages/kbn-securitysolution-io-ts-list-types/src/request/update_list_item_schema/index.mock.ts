/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ID, LIST_ITEM_ID, META, VALUE } from '../../constants/index.mock';

import { UpdateListItemSchema } from '.';

export const getUpdateListItemSchemaMock = (): UpdateListItemSchema => ({
  id: ID,
  meta: META,
  value: VALUE,
});

/**
 * Useful for end to end testing
 */
export const getUpdateMinimalListItemSchemaMock = (): UpdateListItemSchema => ({
  id: LIST_ITEM_ID,
  value: VALUE,
});
