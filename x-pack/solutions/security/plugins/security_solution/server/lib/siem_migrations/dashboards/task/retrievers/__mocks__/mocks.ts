/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PublicMethodsOf } from '@kbn/utility-types';
import type { DashboardMigrationsRetriever } from '..';

export const createDashboardMigrationsRetrieverMock = () => {
  const mockResources = {
    initialize: jest.fn().mockResolvedValue(undefined),
    getResources: jest.fn().mockResolvedValue({}),
  };

  const mockIntegrations = {
    populateIndex: jest.fn().mockResolvedValue(undefined),
    search: jest.fn().mockResolvedValue([]),
  };

  const mockPrebuiltDashboards = {
    populateIndex: jest.fn().mockResolvedValue(undefined),
    search: jest.fn().mockResolvedValue([]),
  };

  const mockRetriever = {
    resources: mockResources,
    integrations: mockIntegrations,
    prebuiltDashboards: mockPrebuiltDashboards,
    initialize: jest.fn().mockResolvedValue(undefined),
  };

  return mockRetriever as jest.Mocked<PublicMethodsOf<DashboardMigrationsRetriever>>;
};

export const MockDashboardMigrationsRetriever = jest
  .fn()
  .mockImplementation(() => createDashboardMigrationsRetrieverMock());
