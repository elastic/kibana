/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createDashboardMigrationsDataClientMock } from '../data/__mocks__/mocks';

export const createDashboardMigrationClient = () => ({
  data: createDashboardMigrationsDataClientMock(),
});

export const mockSetup = jest.fn();
export const mockStop = jest.fn();

export const mockCreateClient = jest
  .fn()
  .mockImplementation(() => createDashboardMigrationClient());

export const MockSiemDashboardMigrationsService = jest.fn().mockImplementation(() => ({
  setup: mockSetup,
  createClient: mockCreateClient,
  stop: mockStop,
}));
