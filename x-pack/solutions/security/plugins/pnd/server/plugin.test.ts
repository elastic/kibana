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
import { PND_API_PRIVILEGE_READ, PND_API_PRIVILEGE_WRITE } from '../common/constants';
import { PndPlugin } from './plugin';
import { initializeManagedWorkflows } from './managed_workflows/initialize_managed_workflows';
import { registerOwner } from './managed_workflows/register_owner';
import { registerRoutes } from './routes/register_routes';
import { ensureAgentSafe, registerAgentType } from './agent';

jest.mock('./managed_workflows/register_owner', () => ({
  registerOwner: jest.fn(),
}));

jest.mock('./managed_workflows/initialize_managed_workflows', () => ({
  initializeManagedWorkflows: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('./agent', () => ({
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

    it('does not install managed worker workflows on start', () => {
      const plugin = new PndPlugin(createContext(createConfig({ enabled: false })));
      const coreStart = coreMock.createStart();

      plugin.start(coreStart, {
        spaces: undefined,
        workflowsExtensions: { initManagedWorkflowsClient: jest.fn() },
      } as never);

      expect(initializeManagedWorkflows).not.toHaveBeenCalled();
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
      expect(features.registerKibanaFeature).toHaveBeenCalledWith(
        expect.objectContaining({
          privileges: expect.objectContaining({
            all: expect.objectContaining({
              api: expect.arrayContaining([PND_API_PRIVILEGE_READ, PND_API_PRIVILEGE_WRITE]),
              ui: expect.arrayContaining(['write']),
            }),
            read: expect.objectContaining({ api: [PND_API_PRIVILEGE_READ] }),
          }),
        })
      );
      expect(registerRoutes).toHaveBeenCalled();
      expect(registerAgentType).toHaveBeenCalled();
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

    it('installs managed worker workflows during start', () => {
      const plugin = new PndPlugin(createContext(createConfig({ enabled: true })));
      const coreStart = coreMock.createStart();
      const workflowsExtensions = { initManagedWorkflowsClient: jest.fn() };

      plugin.start(coreStart, {
        spaces: undefined,
        workflowsExtensions,
      } as never);

      expect(initializeManagedWorkflows).toHaveBeenCalledWith(
        expect.objectContaining({
          workflowsExtensions,
        })
      );
    });

    it('ensures the thin agent in the default space', () => {
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
  });
});
