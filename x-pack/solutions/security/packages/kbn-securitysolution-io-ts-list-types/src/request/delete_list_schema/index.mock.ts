/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { LIST_ID } from '../../constants/index.mock';

import { DeleteListSchema } from '.';

export const getDeleteListSchemaMock = (): DeleteListSchema => ({
  deleteReferences: false,
  id: LIST_ID,
  ignoreReferences: true,
});
