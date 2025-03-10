/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SearchListItemSchema } from '.';
import { VALUE } from '../../constants/index.mock';
import { getListItemResponseMock } from '../list_item_schema/index.mock';

export const getSearchListItemResponseMock = (): SearchListItemSchema => ({
  items: [getListItemResponseMock()],
  value: VALUE,
});
