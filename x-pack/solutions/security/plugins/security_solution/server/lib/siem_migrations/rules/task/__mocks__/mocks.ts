/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const mockRuleMigrationsTaskClient = {
  start: jest.fn().mockResolvedValue({ started: true }),
  stop: jest.fn().mockResolvedValue({ stopped: true }),
  getStats: jest.fn().mockResolvedValue({
    status: 'done',
    rules: {
      total: 1,
      finished: 1,
      processing: 0,
      pending: 0,
      failed: 0,
    },
  }),
  getAllStats: jest.fn().mockResolvedValue([]),
};

export const MockRuleMigrationsTaskClient = jest
  .fn()
  .mockImplementation(() => mockRuleMigrationsTaskClient);

// Rule migrations task service
export const mockStopAll = jest.fn();
export const mockCreateClient = jest.fn().mockReturnValue(mockRuleMigrationsTaskClient);

export const MockRuleMigrationsTaskService = jest.fn().mockImplementation(() => ({
  createClient: mockCreateClient,
  stopAll: mockStopAll,
}));
