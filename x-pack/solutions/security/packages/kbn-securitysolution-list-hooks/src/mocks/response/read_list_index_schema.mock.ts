/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ListItemIndexExistSchema } from '@kbn/securitysolution-io-ts-list-types';

export const getListIndexExistSchemaMock = (
  overrides: Partial<ListItemIndexExistSchema> = {}
): ListItemIndexExistSchema => ({
  list_index: true,
  list_item_index: true,
  ...overrides,
});
