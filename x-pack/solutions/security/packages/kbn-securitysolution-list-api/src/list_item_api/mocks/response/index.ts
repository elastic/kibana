/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FoundListItemSchema, ListItemSchema } from '@kbn/securitysolution-io-ts-list-types';

import { getListItemResponseMock } from './list_item_schema.mock';

export const getFoundListSchemaMock = (): FoundListItemSchema => ({
  cursor: '123',
  data: [getListItemResponseMock()],
  page: 1,
  per_page: 1,
  total: 1,
});

export const getCreateListItemResponseMock = (): ListItemSchema => getListItemResponseMock();
export const getUpdatedListItemResponseMock = (): ListItemSchema => getListItemResponseMock();
export const getDeletedListItemResponseMock = (): ListItemSchema => getListItemResponseMock();
