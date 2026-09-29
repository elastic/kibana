/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';

import { coreMock } from '@kbn/core/server/mocks';
import { DEFAULT_SPACE_ID } from '@kbn/core-spaces-common';
import { ALERTZERO_ENABLED_SETTING_ID } from '@kbn/alertzero-common';
import { loggerMock } from '@kbn/logging-mocks';
import type { AlertZeroConfig } from './config';
import { ALERTZERO_API_PRIVILEGE_READ, ALERTZERO_API_PRIVILEGE_WRITE } from '../common/constants';
import { AlertZeroPlugin } from './plugin';
import { initializeManagedWorkflows } from './managed_workflows/initialize_managed_workflows';
import { registerOwner } from './managed_workflows/register_owner';
import { registerRoutes } from './routes/register_routes';
import { ensureAgentSafe, registerAgentType } from './agent';
import { registerAlertZeroInferenceFeatures } from './inference_features';

vi.mock('./managed_workflows/register_owner', () => {
      const mocked = {
      registerOwner: vi.fn(),
    };
      return { ...mocked, default: mocked };
    });

vi.mock('./inference_features', () => {
      const mocked = {
      registerAlertZeroInferenceFeatures: vi.fn(),
    };
      return { ...mocked, default: mocked };
    });

vi.mock('./managed_workflows/initialize_managed_workflows', () => {
      const mocked = {
      initializeManagedWorkflows: vi.fn().mockResolvedValue(undefined),
    };
      return { ...mocked, default: mocked };
    });

vi.mock('./agent', () => {
      const mocked = {
      agentType: { id: 'mock-alertzero-type', baseConfiguration: {} },
      ensureAgentSafe: vi.fn().mockResolvedValue(undefined),
      registerAgentType: vi.fn(),
    };
      return { ...mocked, default: mocked };
    });

vi.mock('./routes/register_routes', () => {
      const mocked = {
      registerRoutes: vi.fn(),
    };
      return { ...mocked, default: mocked };
    });

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
    vi.clearAllMocks();
  });

  describe('when xpack.alertzero.enabled is false', () => {
    // Registration sits after the config guard, which is the only thing keeping the AlertZero
    // section off the Feature settings page: the inference registry is not space-filtered and
    // `visibilityCondition` keys off a uiSetting, so plugin config cannot hide it any other way.
    it('does not register managed-workflow ownership, features, inference tiers, or HTTP routes', () => {
      const plugin = new AlertZeroPlugin(createContext(createConfig({ enabled: false })));
      const coreSetup = coreMock.createSetup();
      const features = { registerKibanaFeature: vi.fn() };
      const workflowsExtensions = { registerManagedWorkflowOwner: vi.fn() };

      const result = plugin.setup(
        coreSetup as never,
        {
          features,
          workflowsExtensions,
          workflowsManagement: undefined,
        } as never
      );

      expect(result).toEqual({ isEnabled: false });
      expect(registerOwner).not.toHaveBeenCalled();
      expect(features.registerKibanaFeature).not.toHaveBeenCalled();
      expect(registerRoutes).not.toHaveBeenCalled();
      expect(coreSetup.http.createRouter).not.toHaveBeenCalled();
      expect(registerAgentType).not.toHaveBeenCalled();
      expect(registerAlertZeroInferenceFeatures).not.toHaveBeenCalled();
      expect(coreSetup.uiSettings.register).not.toHaveBeenCalled();
    });

    // Serverless allowlists `securitySolution:enableAlertZero` off this contract; a wrong answer
    // here fails Kibana startup in dev with "in the allowlist but is not registered".
    it('reports isEnabled false so consumers do not allowlist an unregistered setting', () => {
      const plugin = new AlertZeroPlugin(createContext(createConfig({ enabled: false })));

      const contract = plugin.setup(
        coreMock.createSetup() as never,
        {
          features: { registerKibanaFeature: vi.fn() },
          workflowsExtensions: { registerManagedWorkflowOwner: vi.fn() },
          workflowsManagement: undefined,
        } as never
      );

      expect(contract).toEqual({ isEnabled: false });
    });

    it('does not install managed worker workflows on start', () => {
      const plugin = new AlertZeroPlugin(createContext(createConfig({ enabled: false })));
      const coreStart = coreMock.createStart();

      plugin.start(coreStart, {
        spaces: undefined,
        workflowsExtensions: { initManagedWorkflowsClient: vi.fn() },
      } as never);

      expect(initializeManagedWorkflows).not.toHaveBeenCalled();
      expect(ensureAgentSafe).not.toHaveBeenCalled();
    });
  });

  describe('when xpack.alertzero.enabled is true', () => {
    it('registers ownership, feature privileges, and routes during setup', () => {
      const plugin = new AlertZeroPlugin(createContext(createConfig({ enabled: true })));
      const coreSetup = coreMock.createSetup();
      const features = { registerKibanaFeature: vi.fn() };
      const workflowsExtensions = { registerManagedWorkflowOwner: vi.fn() };

      const result = plugin.setup(
        coreSetup as never,
        {
          features,
          workflowsExtensions,
          workflowsManagement: { management: {} },
          agentBuilder: {
            tools: { register: vi.fn() },
            attachments: { registerType: vi.fn() },
          },
        } as never
      );

      expect(result).toEqual({ isEnabled: true });
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
            read: expect.objectContaining({
              api: [ALERTZERO_API_PRIVILEGE_READ],
            }),
          }),
        })
      );
      expect(features.registerKibanaFeature.mock.calls[0][0].subFeatures).toBeUndefined();
      expect(registerRoutes).toHaveBeenCalled();
      expect(registerAgentType).toHaveBeenCalled();
    });

    it('registers the per-space enablement advanced setting', () => {
      const plugin = new AlertZeroPlugin(createContext(createConfig({ enabled: true })));
      const coreSetup = coreMock.createSetup();

      plugin.setup(
        coreSetup as never,
        {
          features: { registerKibanaFeature: vi.fn() },
          workflowsExtensions: { registerManagedWorkflowOwner: vi.fn() },
          workflowsManagement: { management: {} },
          agentBuilder: {
            tools: { register: vi.fn() },
            attachments: { registerType: vi.fn() },
          },
        } as never
      );

      expect(coreSetup.uiSettings.register).toHaveBeenCalledWith(
        expect.objectContaining({
          [ALERTZERO_ENABLED_SETTING_ID]: expect.objectContaining({ value: false }),
        })
      );
    });

    it('reports isEnabled true so consumers can allowlist the setting', () => {
      const plugin = new AlertZeroPlugin(createContext(createConfig({ enabled: true })));

      const contract = plugin.setup(
        coreMock.createSetup() as never,
        {
          features: { registerKibanaFeature: vi.fn() },
          workflowsExtensions: { registerManagedWorkflowOwner: vi.fn() },
          workflowsManagement: { management: {} },
          agentBuilder: {
            tools: { register: vi.fn() },
            attachments: { registerType: vi.fn() },
          },
        } as never
      );

      expect(contract).toEqual({ isEnabled: true });
    });

    it('registers the AlertZero thin agent type when Agent Builder is available at setup', () => {
      const plugin = new AlertZeroPlugin(createContext(createConfig({ enabled: true })));
      const coreSetup = coreMock.createSetup();
      const features = { registerKibanaFeature: vi.fn() };
      const workflowsExtensions = { registerManagedWorkflowOwner: vi.fn() };
      const agentBuilder = {
        agents: { registerType: vi.fn() },
        tools: { register: vi.fn() },
        attachments: { registerType: vi.fn() },
      };

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
      expect(agentBuilder.attachments.registerType).toHaveBeenCalledTimes(1);
    });

    it('registers the inference tiers with the optional searchInferenceEndpoints setup contract', () => {
      const plugin = new AlertZeroPlugin(createContext(createConfig({ enabled: true })));
      const searchInferenceEndpoints = { features: { register: vi.fn() } };

      plugin.setup(
        coreMock.createSetup() as never,
        {
          features: { registerKibanaFeature: vi.fn() },
          workflowsExtensions: { registerManagedWorkflowOwner: vi.fn() },
          workflowsManagement: { management: {} },
          agentBuilder: {
            tools: { register: vi.fn() },
            attachments: { registerType: vi.fn() },
          },
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
      const workflowsExtensions = { initManagedWorkflowsClient: vi.fn() };

      plugin.start(coreStart, {
        spaces: undefined,
        workflowsExtensions,
        proposals: { getProposalsService: vi.fn().mockReturnValue({}) },
        agenticInvestigations: {
          getImpactClient: vi.fn(),
        },
        inference: {},
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
      const agentBuilder = { agents: { ensure: vi.fn() } };

      plugin.start(coreStart, {
        spaces: undefined,
        workflowsExtensions: { initManagedWorkflowsClient: vi.fn() },
        agentBuilder,
        proposals: { getProposalsService: vi.fn().mockReturnValue({}) },
        agenticInvestigations: {
          getImpactClient: vi.fn(),
        },
        inference: {},
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
