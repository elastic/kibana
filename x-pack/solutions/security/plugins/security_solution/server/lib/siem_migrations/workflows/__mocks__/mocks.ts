/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const createWorkflowMigrationsDataClientMock = () => ({
  migrations: {
    create: jest.fn(),
    get: jest.fn(),
    update: jest.fn(),
    getAll: jest.fn(),
    saveAsStarted: jest.fn(),
    saveAsFinished: jest.fn(),
    saveAsFailed: jest.fn(),
    setIsStopped: jest.fn(),
    prepareDelete: jest.fn(),
  },
  items: {
    create: jest.fn(),
    get: jest.fn(),
    getStats: jest.fn(),
    getAllStats: jest.fn(),
    updateStatus: jest.fn(),
    saveProcessing: jest.fn(),
    saveCompleted: jest.fn(),
    saveError: jest.fn(),
    releaseProcessing: jest.fn(),
  },
  resources: {
    create: jest.fn(),
    prepareDelete: jest.fn(),
  },
  deleteMigration: jest.fn(),
});

export const createWorkflowMigrationsTaskClientMock = () => ({
  start: jest.fn(),
  stop: jest.fn(),
  getStats: jest.fn(),
  getAllStats: jest.fn(),
  isMigrationRunning: jest.fn().mockReturnValue(false),
  updateToRetry: jest.fn(),
});

export const createWorkflowMigrationClient = () => ({
  data: createWorkflowMigrationsDataClientMock(),
  task: createWorkflowMigrationsTaskClientMock(),
});

export const mockSetup = jest.fn();
export const mockStop = jest.fn();

export const mockCreateClient = jest
  .fn()
  .mockImplementation(() => createWorkflowMigrationClient());

export const MockSiemWorkflowMigrationsService = jest.fn().mockImplementation(() => ({
  setup: mockSetup,
  createClient: mockCreateClient,
  stop: mockStop,
}));
