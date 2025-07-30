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

export const createSiemMigrationsMock = () => {
  return {
    rules: {
      getLatestStats$: jest.fn(),
      getMissingCapabilities: jest.fn(),
      hasMissingCapabilities: jest.fn(),
      isAvailable: jest.fn(),
      startPolling: jest.fn(),
      createRuleMigration: jest.fn(),
      upsertMigrationResources: jest.fn(),
      startRuleMigration: jest.fn(),
      getRuleMigrationStats: jest.fn(),
      getRuleMigrationsStats: jest.fn(),
      getMissingResources: jest.fn(),
      getIntegrations: jest.fn(),
      connectorIdStorage: createRuleMigrationStorageMock(),
      traceOptionsStorage: createRuleMigrationStorageMock(),
      telemetry: createTelemetryServiceMock(),
    },
    dashboards: {
      getLatestStats$: jest.fn(),
      getMissingCapabilities: jest.fn(),
      hasMissingCapabilities: jest.fn(),
      isAvailable: jest.fn(),
      startPolling: jest.fn(),
      getMissingResources: jest.fn(),
      getIntegrations: jest.fn(),
      connectorIdStorage: createRuleMigrationStorageMock(),
      traceOptionsStorage: createRuleMigrationStorageMock(),
      telemetry: createTelemetryServiceMock(),
    },
  };
};
