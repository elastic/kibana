/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { UseListsIndexReturn } from './use_lists_index';

export const getUseListsIndexMock: () => jest.Mocked<UseListsIndexReturn> = () => ({
  createIndex: jest.fn(),
  indexExists: null,
  error: null,
  loading: false,
});
