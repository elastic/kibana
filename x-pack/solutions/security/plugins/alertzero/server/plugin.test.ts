/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { coreMock } from '@kbn/core/server/mocks';
import { DEFAULT_SPACE_ID } from '@kbn/core-spaces-common';
import { loggerMock } from '@kbn/logging-mocks';
import type { AlertZeroConfig } from './config';
import { ALERTZERO_API_PRIVILEGE_READ, ALERTZERO_API_PRIVILEGE_WRITE } from '../common/constants';
import { AlertZeroPlugin } from './plugin';
import { initializeManagedWorkflows } from './managed_workflows/initialize_managed_workflows';
import { registerOwner } from './managed_workflows/register_owner';
import { registerRoutes } from './routes/register_routes';
import { ensureAgentSafe, registerAgentType } from './agent';
import { registerAlertZeroInferenceFeatures } from './inference_features';

jest.mock('./managed_workflows/register_owner', () => ({
  registerOwner: jest.fn(),
}));

jest.mock('./inference_features', () => ({
  registerAlertZeroInferenceFeatures: jest.fn(),
}));

jest.mock('./managed_workflows/initialize_managed_workflows', () => ({
  initializeManagedWorkflows: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('./agent', () => ({
  agentType: { id: 'mock-alertzero-type', baseConfiguration: {} },
  ensureAgentSafe: jest.fn().mockResolvedValue(undefined),
  registerAgentType: jest.fn(),
}));

jest.mock('./routes/register_routes', () => ({
  registerRoutes: jest.fn(),
}));

const createConfig = (overrides: Partial<AlertZeroConfig> = {}): AlertZeroConfig => ({
  enabled: false,
  ...overrides,
});

const createContext = (config: AlertZeroConfig) => {
  const context = {
    logger: { get: () => loggerMock.create() },
    config: { get: () => config },
  } as unknown as ConstructorParameters<typeof AlertZeroPlugin>[0];
  return context;
};

describe('AlertZeroPlugin feature-flag gating', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('when xpack.alertzero.enabled is false', () => {
    // Registration sits after the config guard, which is the only thing keeping the AlertZero
    // section off the Feature settings page: the inference registry is not space-filtered and
    // `visibilityCondition` keys off a uiSetting, so plugin config cannot hide it any other way.
    it('does not register managed-workflow ownership, features, inference tiers, or HTTP routes', () => {
      const plugin = new AlertZeroPlugin(createContext(createConfig({ enabled: false })));
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
      expect(registerAlertZeroInferenceFeatures).not.toHaveBeenCalled();
    });

    it('does not install managed worker workflows on start', () => {
      const plugin = new AlertZeroPlugin(createContext(createConfig({ enabled: false })));
      const coreStart = coreMock.createStart();

      plugin.start(coreStart, {
        spaces: undefined,
        workflowsExtensions: { initManagedWorkflowsClient: jest.fn() },
      } as never);

      expect(initializeManagedWorkflows).not.toHaveBeenCalled();
      expect(ensureAgentSafe).not.toHaveBeenCalled();
    });
  });

  describe('when xpack.alertzero.enabled is true', () => {
    it('registers ownership, feature privileges, and routes during setup', () => {
      const plugin = new AlertZeroPlugin(createContext(createConfig({ enabled: true })));
      const coreSetup = coreMock.createSetup();
      const features = { registerKibanaFeature: jest.fn() };
      const workflowsExtensions = { registerManagedWorkflowOwner: jest.fn() };

      plugin.setup(
        coreSetup as never,
        {
          features,
          workflowsExtensions,
          workflowsManagement: { management: {} },
          agentBuilder: { tools: { register: jest.fn() } },
        } as never
      );

      expect(registerOwner).toHaveBeenCalledWith({ workflowsExtensions });
      expect(features.registerKibanaFeature).toHaveBeenCalledWith(
        expect.objectContaining({
          privileges: expect.objectContaining({
            all: expect.objectContaining({
              api: expect.arrayContaining([
                ALERTZERO_API_PRIVILEGE_READ,
                ALERTZERO_API_PRIVILEGE_WRITE,
              ]),
              ui: expect.arrayContaining(['write']),
            }),
            read: expect.objectContaining({ api: [ALERTZERO_API_PRIVILEGE_READ] }),
          }),
        })
      );
      expect(registerRoutes).toHaveBeenCalled();
      expect(registerAgentType).toHaveBeenCalled();
    });

    it('registers the AlertZero thin agent type when Agent Builder is available at setup', () => {
      const plugin = new AlertZeroPlugin(createContext(createConfig({ enabled: true })));
      const coreSetup = coreMock.createSetup();
      const features = { registerKibanaFeature: jest.fn() };
      const workflowsExtensions = { registerManagedWorkflowOwner: jest.fn() };
      const agentBuilder = { agents: { registerType: jest.fn() }, tools: { register: jest.fn() } };

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

    it('registers the inference tiers with the optional searchInferenceEndpoints setup contract', () => {
      const plugin = new AlertZeroPlugin(createContext(createConfig({ enabled: true })));
      const searchInferenceEndpoints = { features: { register: jest.fn() } };

      plugin.setup(
        coreMock.createSetup() as never,
        {
          features: { registerKibanaFeature: jest.fn() },
          workflowsExtensions: { registerManagedWorkflowOwner: jest.fn() },
          workflowsManagement: { management: {} },
          agentBuilder: { tools: { register: jest.fn() } },
          searchInferenceEndpoints,
        } as never
      );

      expect(registerAlertZeroInferenceFeatures).toHaveBeenCalledWith(
        searchInferenceEndpoints,
        expect.anything()
      );
    });

    it('installs managed worker workflows during start', () => {
      const plugin = new AlertZeroPlugin(createContext(createConfig({ enabled: true })));
      const coreStart = coreMock.createStart();
      const workflowsExtensions = { initManagedWorkflowsClient: jest.fn() };

      plugin.start(coreStart, {
        spaces: undefined,
        workflowsExtensions,
        agenticInvestigations: { getProposalsService: jest.fn().mockReturnValue({}) },
      } as never);

      expect(initializeManagedWorkflows).toHaveBeenCalledWith(
        expect.objectContaining({
          workflowsExtensions,
        })
      );
    });

    it('ensures the thin agent in the default space', () => {
      const plugin = new AlertZeroPlugin(createContext(createConfig({ enabled: true })));
      const coreStart = coreMock.createStart();
      const agentBuilder = { agents: { ensure: jest.fn() } };

      plugin.start(coreStart, {
        spaces: undefined,
        workflowsExtensions: { initManagedWorkflowsClient: jest.fn() },
        agentBuilder,
        agenticInvestigations: { getProposalsService: jest.fn().mockReturnValue({}) },
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
