/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RuleMigrationsRetriever } from '..';
import type { RuleMigrationsDataClient } from '../../../data/rule_migrations_data_client';

export const createRuleMigrationsRetrieverMock = () => {
  const mockResources = {
    initialize: jest.fn().mockResolvedValue(undefined),
    getResources: jest.fn().mockResolvedValue({}),
    migrationId: 'test-migration-id',
    dataClient: {} as RuleMigrationsDataClient,
  };

  const mockIntegrations = {
    populateIndex: jest.fn().mockResolvedValue(undefined),
    getIntegrations: jest.fn().mockResolvedValue([]),
  };

  const mockPrebuiltRules = {
    populateIndex: jest.fn().mockResolvedValue(undefined),
    search: jest.fn().mockResolvedValue([]),
  };

  return {
    resources: mockResources,
    integrations: mockIntegrations,
    prebuiltRules: mockPrebuiltRules,
    initialize: jest.fn().mockResolvedValue(undefined),
  } as unknown as RuleMigrationsRetriever;
};

export const MockRuleMigrationsRetriever = jest
  .fn()
  .mockImplementation(() => createRuleMigrationsRetrieverMock());
