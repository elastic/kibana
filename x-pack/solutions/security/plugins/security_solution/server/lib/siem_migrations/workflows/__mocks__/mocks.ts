/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const createWorkflowMigrationsDataClientMock = () => ({
  migrations: {
    create: jest.fn().mockResolvedValue('migration-1'),
    get: jest.fn().mockResolvedValue({
      id: 'mig-1',
      name: 'Tines stories',
      created_by: 'user',
      created_at: '2026-01-01T00:00:00.000Z',
    }),
    update: jest.fn(),
    getAll: jest.fn().mockResolvedValue([]),
  },
  items: {
    create: jest.fn(),
    get: jest.fn().mockResolvedValue({ total: 0, data: [] }),
    update: jest.fn(),
    getStats: jest.fn().mockResolvedValue({
      id: 'mig-1',
      items: { total: 0, pending: 0, processing: 0, completed: 0, failed: 0 },
      created_at: '2026-01-01T00:00:00.000Z',
      last_updated_at: '2026-01-01T00:00:00.000Z',
    }),
    getAllStats: jest.fn().mockResolvedValue([]),
  },
  deleteMigration: jest.fn(),
});

export const createWorkflowMigrationClient = () => ({
  data: createWorkflowMigrationsDataClientMock(),
});

export const mockSetup = jest.fn();
export const mockStop = jest.fn();

export const mockCreateClient = jest.fn().mockImplementation(() => createWorkflowMigrationClient());

export const MockSiemWorkflowMigrationsService = jest.fn().mockImplementation(() => ({
  setup: mockSetup,
  createClient: mockCreateClient,
  stop: mockStop,
}));
