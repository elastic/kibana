/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CreateListRequestBodyInput } from '@kbn/securitysolution-lists-common/api';

import { DESCRIPTION, LIST_ID, META, NAME, TYPE, VERSION } from '../../constants.mock';

export const getCreateListSchemaMock = (): CreateListRequestBodyInput => ({
  description: DESCRIPTION,
  deserializer: undefined,
  id: LIST_ID,
  meta: META,
  name: NAME,
  serializer: undefined,
  type: TYPE,
  version: VERSION,
});

/**
 * Useful for end to end tests and other mechanisms which want to fill in the values
 */
export const getCreateMinimalListSchemaMock = (): CreateListRequestBodyInput => ({
  description: DESCRIPTION,
  id: LIST_ID,
  name: NAME,
  type: TYPE,
});

/**
 * Useful for end to end tests and other mechanisms which want to fill in the values
 */
export const getCreateMinimalListSchemaMockWithoutId = (): CreateListRequestBodyInput => ({
  description: DESCRIPTION,
  name: NAME,
  type: TYPE,
});
