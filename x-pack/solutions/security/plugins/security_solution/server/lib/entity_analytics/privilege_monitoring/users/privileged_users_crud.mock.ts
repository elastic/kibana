/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PrivmonUserCrudService } from './privileged_users_crud';

const buildMockPrivmonUserCrudService = (): jest.Mocked<PrivmonUserCrudService> => ({
  create: jest.fn(),
  get: jest.fn(),
  update: jest.fn(),
  list: jest.fn().mockResolvedValue([]),
  delete: jest.fn(),
});

export const privmonUserCrudServiceMock = {
  create: buildMockPrivmonUserCrudService,
};
