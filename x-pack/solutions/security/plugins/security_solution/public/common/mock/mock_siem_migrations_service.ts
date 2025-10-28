/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createTelemetryServiceMock } from '../lib/telemetry/telemetry_service.mock';

const createRuleMigrationStorageMock = () => {
  return {
    get: jest.fn(),
    set: jest.fn(),
    remove: jest.fn(),
  };
};

const commonMocks = {
  getLatestStats$: jest.fn(),
  getMissingCapabilities: jest.fn(),
  hasMissingCapabilities: jest.fn(),
  isAvailable: jest.fn(),
  startPolling: jest.fn(),
  deleteMigration: jest.fn(),
  connectorIdStorage: createRuleMigrationStorageMock(),
  traceOptionsStorage: createRuleMigrationStorageMock(),
  startMigrationFromStats: jest.fn(),
};

export const createSiemMigrationsMock = () => {
  return {
    rules: {
      ...commonMocks,
      createRuleMigration: jest.fn(),
      upsertMigrationResources: jest.fn(),
      startRuleMigration: jest.fn(),
      getMigrationsStats: jest.fn(),
      getMissingResources: jest.fn(),
      getIntegrations: jest.fn(),
      addRuleToMigration: jest.fn(),
      telemetry: createTelemetryServiceMock(),
      api: {
        getMissingResources: jest.fn(),
      },
    },

    dashboards: {
      ...commonMocks,
      addDashboardToMigration: jest.fn(),
      createDashboardMigration: jest.fn(),
      upsertMigrationResources: jest.fn(),
      startDashboardMigration: jest.fn(),
      stopDashboardMigration: jest.fn(),
      getMigrationsStats: jest.fn(),
      getMissingResources: jest.fn(),
      deleteMigration: jest.fn(),
      api: {
        getDashboardMigrationMissingResources: jest.fn(),
      },
    },
  };
};
