/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggingSystemMock } from '@kbn/core/server/mocks';

import { mlPluginServerMock } from '@kbn/ml-plugin/server/mocks';

import { ConfigType } from '..';
import { GlobalConfigService } from '../services/global_config_service';

export const mockLogger = loggingSystemMock.createLogger().get();

export const mockMl = mlPluginServerMock.createSetupContract();

export const mockConfig: ConfigType = {
  enabled: true,
  hasConnectors: true,
  hasDefaultIngestPipeline: true,
  hasDocumentLevelSecurityEnabled: true,
  hasIncrementalSyncEnabled: true,
  hasNativeConnectors: true,
  hasWebCrawler: true,
};

/**
 * This is useful for tests that don't use either config or log,
 * but should still pass them in to pass Typescript definitions
 */
export const mockDependencies = {
  // Mock router should be handled on a per-test basis
  config: mockConfig,
  getSavedObjectsService: jest.fn(),
  getStartServices: jest.fn(),
  globalConfigService: new GlobalConfigService(),
  log: mockLogger,
  ml: mockMl,
};
