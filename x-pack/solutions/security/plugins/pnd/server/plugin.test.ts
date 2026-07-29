/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { coreMock } from '@kbn/core/server/mocks';
import { DEFAULT_SPACE_ID } from '@kbn/core-spaces-common';
import { loggerMock } from '@kbn/logging-mocks';
import type { PndConfig } from './config';
import { PndPlugin } from './plugin';
import { installStatic } from './managed_workflows/install_static';
import { registerOwner } from './managed_workflows/register_owner';
import { registerRoutes } from './routes/register_routes';
import { ensureAgentSafe, registerAgentType } from './agent_builder';

jest.mock('./managed_workflows/register_owner', () => ({
  registerOwner: jest.fn(),
}));

jest.mock('./managed_workflows/install_static', () => ({
  installStatic: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('./agent_builder', () => ({
  agentType: { id: 'mock-pnd-type', baseConfiguration: {} },
  ensureAgentSafe: jest.fn().mockResolvedValue(undefined),
  registerAgentType: jest.fn(),
}));

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
    it('does not register managed-workflow ownership, features, or HTTP routes', () => {
      const plugin = new PndPlugin(createContext(createConfig({ enabled: false })));
      const coreSetup = coreMock.createSetup();
      const features = { registerKibanaFeature: jest.fn() };
      const workflowsExtensions = { registerManagedWorkflowOwner: jest.fn() };

      plugin.setup(
        coreSetup as never,
        {
          features,
          workflowsExtensions,
          workflowsManagement: undefined,
        } as never
      );

      expect(registerOwner).not.toHaveBeenCalled();
      expect(features.registerKibanaFeature).not.toHaveBeenCalled();
      expect(registerRoutes).not.toHaveBeenCalled();
      expect(coreSetup.http.createRouter).not.toHaveBeenCalled();
      expect(registerAgentType).not.toHaveBeenCalled();
    });

    it('does not install managed watch workflows on start', () => {
      const plugin = new PndPlugin(createContext(createConfig({ enabled: false })));
      const coreStart = coreMock.createStart();

      plugin.start(coreStart, {
        spaces: undefined,
        workflowsExtensions: { initManagedWorkflowsClient: jest.fn() },
      } as never);

      expect(installStatic).not.toHaveBeenCalled();
      expect(ensureAgentSafe).not.toHaveBeenCalled();
    });
  });

  describe('when xpack.pnd.enabled is true', () => {
    it('registers ownership, feature privileges, and routes during setup', () => {
      const plugin = new PndPlugin(createContext(createConfig({ enabled: true })));
      const coreSetup = coreMock.createSetup();
      const features = { registerKibanaFeature: jest.fn() };
      const workflowsExtensions = { registerManagedWorkflowOwner: jest.fn() };

      plugin.setup(
        coreSetup as never,
        {
          features,
          workflowsExtensions,
          workflowsManagement: { management: {} },
        } as never
      );

      expect(registerOwner).toHaveBeenCalledWith({ workflowsExtensions });
      expect(features.registerKibanaFeature).toHaveBeenCalled();
      expect(registerRoutes).toHaveBeenCalled();
      expect(registerAgentType).not.toHaveBeenCalled();
    });

    it('registers the PND thin agent type when Agent Builder is available at setup', () => {
      const plugin = new PndPlugin(createContext(createConfig({ enabled: true })));
      const coreSetup = coreMock.createSetup();
      const features = { registerKibanaFeature: jest.fn() };
      const workflowsExtensions = { registerManagedWorkflowOwner: jest.fn() };
      const agentBuilder = { agents: { registerType: jest.fn() } };

      plugin.setup(
        coreSetup as never,
        {
          features,
          workflowsExtensions,
          workflowsManagement: { management: {} },
          agentBuilder,
        } as never
      );

      expect(registerAgentType).toHaveBeenCalledWith(agentBuilder);
    });

    it('installs managed watch workflows during start', () => {
      const plugin = new PndPlugin(createContext(createConfig({ enabled: true })));
      const coreStart = coreMock.createStart();
      const workflowsExtensions = { initManagedWorkflowsClient: jest.fn() };

      plugin.start(coreStart, {
        spaces: undefined,
        workflowsExtensions,
      } as never);

      expect(installStatic).toHaveBeenCalledWith(
        expect.objectContaining({
          enabled: true,
          workflowsExtensions,
        })
      );
    });

    it('ensures the thin agent in the default space when Agent Builder is available', () => {
      const plugin = new PndPlugin(createContext(createConfig({ enabled: true })));
      const coreStart = coreMock.createStart();
      const agentBuilder = { agents: { ensure: jest.fn() } };

      plugin.start(coreStart, {
        spaces: undefined,
        workflowsExtensions: { initManagedWorkflowsClient: jest.fn() },
        agentBuilder,
      } as never);

      expect(ensureAgentSafe).toHaveBeenCalledWith(
        expect.objectContaining({
          agentBuilder,
          spaceId: DEFAULT_SPACE_ID,
        })
      );
    });

    it('skips agent ensure when Agent Builder is unavailable', () => {
      const plugin = new PndPlugin(createContext(createConfig({ enabled: true })));
      const coreStart = coreMock.createStart();

      plugin.start(coreStart, {
        spaces: undefined,
        workflowsExtensions: { initManagedWorkflowsClient: jest.fn() },
      } as never);

      expect(ensureAgentSafe).not.toHaveBeenCalled();
    });
  });
});
