/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DATE_NOW, LIST_ID, META, TIE_BREAKER, USER, VALUE } from '../../../common/constants.mock';

import { IndexEsListItemSchema } from './index_es_list_item_schema';

export const getIndexESListItemMock = (ip = VALUE): IndexEsListItemSchema => ({
  '@timestamp': DATE_NOW,
  created_at: DATE_NOW,
  created_by: USER,
  deserializer: undefined,
  ip,
  list_id: LIST_ID,
  meta: META,
  serializer: undefined,
  tie_breaker_id: TIE_BREAKER,
  updated_at: DATE_NOW,
  updated_by: USER,
});
