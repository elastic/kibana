/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DESCRIPTION, ID, LIST_ID, META, NAME, NAMESPACE_TYPE } from '../../constants/index.mock';

import type { UpdateExceptionListSchema } from '.';

export const getUpdateExceptionListSchemaMock = (): UpdateExceptionListSchema => ({
  _version: undefined,
  description: DESCRIPTION,
  id: ID,
  list_id: LIST_ID,
  meta: META,
  name: NAME,
  namespace_type: NAMESPACE_TYPE,
  os_types: [],
  tags: ['malware'],
  type: 'endpoint',
});

/**
 * Useful for end to end tests and other mechanisms which want to fill in the values
 * after doing a get of the structure.
 */
export const getUpdateMinimalExceptionListSchemaMock = (): UpdateExceptionListSchema => ({
  description: DESCRIPTION,
  list_id: LIST_ID,
  name: NAME,
  type: 'endpoint',
});
