/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createInitListener } from './init_listener';
import type { DataViewsServicePublic } from '@kbn/data-views-plugin/public';

const mockDataViewsService = {
  get: jest.fn(),
  create: jest.fn().mockResolvedValue({
    id: 'adhoc_test-*',
    isPersisted: () => false,
    toSpec: () => ({ id: 'adhoc_test-*', title: 'test-*' }),
  }),
} as unknown as DataViewsServicePublic;

describe('createInitListener', () => {
  let listener: ReturnType<typeof createInitListener>;

  beforeEach(() => {
    jest.clearAllMocks();
    listener = createInitListener({ dataViews: mockDataViewsService });
  });

  it.todo('should load the data views and dispatch further actions');
});
