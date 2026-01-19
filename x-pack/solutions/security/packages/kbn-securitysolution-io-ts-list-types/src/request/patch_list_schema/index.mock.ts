/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DESCRIPTION, LIST_ITEM_ID, META, NAME } from '../../constants/index.mock';

import type { PatchListSchema } from '.';

export const getPathListSchemaMock = (): PatchListSchema => ({
  description: DESCRIPTION,
  id: LIST_ITEM_ID,
  meta: META,
  name: NAME,
});
