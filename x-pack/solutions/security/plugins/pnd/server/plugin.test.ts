/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { coreMock } from '@kbn/core/server/mocks';
import { loggerMock } from '@kbn/logging-mocks';
import type { PndConfig } from './config';
import { PndPlugin } from './plugin';
import { registerRoutes } from './routes/register_routes';

jest.mock('./routes/register_routes', () => ({
  registerRoutes: jest.fn(),
}));

const createConfig = (overrides: Partial<PndConfig> = {}): PndConfig => ({
  enabled: false,
  ui: { useMockData: true },
  ...overrides,
});

const createContext = (config: PndConfig) => {
  const context = {
    logger: { get: () => loggerMock.create() },
    config: { get: () => config },
  } as unknown as ConstructorParameters<typeof PndPlugin>[0];
  return context;
};

describe('PndPlugin feature-flag gating', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('when xpack.pnd.enabled is false', () => {
    it('does not register features or HTTP routes', () => {
      const plugin = new PndPlugin(createContext(createConfig({ enabled: false })));
      const coreSetup = coreMock.createSetup();
      const features = { registerKibanaFeature: jest.fn() };

      plugin.setup(
        coreSetup as never,
        {
          features,
          workflowsManagement: undefined,
        } as never
      );

      expect(features.registerKibanaFeature).not.toHaveBeenCalled();
      expect(registerRoutes).not.toHaveBeenCalled();
      expect(coreSetup.http.createRouter).not.toHaveBeenCalled();
    });
  });

  describe('when xpack.pnd.enabled is true', () => {
    it('registers feature privileges and routes during setup', () => {
      const plugin = new PndPlugin(createContext(createConfig({ enabled: true })));
      const coreSetup = coreMock.createSetup();
      const features = { registerKibanaFeature: jest.fn() };

      plugin.setup(
        coreSetup as never,
        {
          features,
          workflowsManagement: { management: {} },
        } as never
      );

      expect(features.registerKibanaFeature).toHaveBeenCalledWith(
        expect.objectContaining({
          privileges: expect.objectContaining({
            all: expect.objectContaining({ ui: ['show', 'write'] }),
            read: expect.objectContaining({ ui: ['show'] }),
          }),
        })
      );
      expect(registerRoutes).toHaveBeenCalled();
    });

    it('creates the live projection without managed workflow installation', () => {
      const plugin = new PndPlugin(
        createContext(createConfig({ enabled: true, ui: { useMockData: false } }))
      );
      const coreSetup = coreMock.createSetup();
      const coreStart = coreMock.createStart();
      const features = { registerKibanaFeature: jest.fn() };

      plugin.setup(
        coreSetup as never,
        {
          features,
          workflowsManagement: { management: {} },
        } as never
      );

      plugin.start(coreStart, {
        spaces: undefined,
      } as never);

      const routeDependencies = (registerRoutes as jest.Mock).mock.calls[0][0];
      expect(routeDependencies.getWatchProjection()).toBeDefined();
    });
  });
});
