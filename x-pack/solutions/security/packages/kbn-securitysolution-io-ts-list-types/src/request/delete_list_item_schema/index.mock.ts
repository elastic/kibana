/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ID, LIST_ID, VALUE } from '../../constants/index.mock';

import type { DeleteListItemSchema } from '.';

export const getDeleteListItemSchemaMock = (): DeleteListItemSchema => ({
  id: ID,
  list_id: LIST_ID,
  value: VALUE,
});
