/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { DESCRIPTION, LIST_ID, META, NAME, _VERSION } from '../../constants/index.mock';

import { UpdateListSchema } from '.';

export const getUpdateListSchemaMock = (): UpdateListSchema => ({
  _version: _VERSION,
  description: DESCRIPTION,
  id: LIST_ID,
  meta: META,
  name: NAME,
});

/**
 * Useful for end to end tests and other mechanisms which want to fill in the values
 * after doing a get of the structure.
 */
export const getUpdateMinimalListSchemaMock = (): UpdateListSchema => ({
  description: DESCRIPTION,
  id: LIST_ID,
  name: NAME,
});
