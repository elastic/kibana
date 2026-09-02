/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { coreMock } from '@kbn/core/server/mocks';
import type { AttackDiscoveryExecutorOptions } from '@kbn/attack-discovery-schedules-common';

import { DiscoveriesPlugin } from './plugin';
import type { DiscoveriesPluginSetupDeps, DiscoveriesPluginStartDeps } from './types';

jest.mock('@kbn/discoveries/impl/attack_discovery/alert_fields', () => ({
  ATTACK_DISCOVERY_ALERTS_CONTEXT: 'siem.security.attack.discovery',
  attackDiscoveryAlertFieldMap: {},
}));

jest.mock('./lib/schedules/workflow_executor', () => ({
  workflowExecutor: jest.fn().mockResolvedValue({ state: {} }),
}));

// Default the feature flag to ON so the scheduled factory proceeds; individual
// tests override with `mockResolvedValueOnce(false)` to exercise the kill-switch.
const mockIsWorkflowsEnabled = jest.fn().mockResolvedValue(true);
jest.mock('@kbn/discoveries/impl/lib/helpers/is_workflows_enabled', () => ({
  isWorkflowsEnabled: (...args: unknown[]) => mockIsWorkflowsEnabled(...args),
}));

jest.mock('./routes', () => ({
  registerRoutes: jest.fn(),
}));

jest.mock('./agent_builder/skills/register_skills', () => ({
  registerSkills: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('./workflows/register_workflow_steps', () => ({
  registerWorkflowSteps: jest.fn().mockReturnValue({ failedSteps: [], registeredSteps: [] }),
}));

jest.mock('@kbn/alerting-plugin/common', () => ({
  mappingFromFieldMap: jest.fn().mockReturnValue({}),
}));

jest.mock('./managed_workflows/install_static', () => ({
  AD_WORKFLOW_IDS: ['system-mock-1', 'system-mock-2'],
  installStatic: jest.fn().mockResolvedValue({ failedIds: [] }),
}));

const { workflowExecutor } = jest.requireMock('./lib/schedules/workflow_executor');
const { installStatic } = jest.requireMock('./managed_workflows/install_static');
const { registerSkills } = jest.requireMock('./agent_builder/skills/register_skills');

/** Drains the microtask + macrotask queues so deferred `getStartServices().then()` work runs. */
const flushPromises = async () => {
  await new Promise((resolve) => setImmediate(resolve));
  await new Promise((resolve) => setImmediate(resolve));
};

const createMockAgentBuilder = () => ({
  attachments: { registerType: jest.fn() },
  skills: { register: jest.fn().mockResolvedValue(undefined) },
});

const createMockRuleRegistry = () => ({
  ruleDataService: {
    initializeIndex: jest.fn().mockReturnValue({
      getReader: jest.fn(),
      getWriter: jest.fn(),
    }),
  },
});

const createMockEventLog = () => ({
  getIndexPattern: jest.fn().mockReturnValue('.kibana-event-log-*'),
  getLogger: jest.fn().mockReturnValue({ logEvent: jest.fn() }),
  registerProviderActions: jest.fn(),
  registerSavedObjectProvider: jest.fn(),
  isLoggingEntries: jest.fn().mockReturnValue(true),
  isIndexingEntries: jest.fn().mockReturnValue(true),
});

const createMockWorkflowsExtensions = () => ({
  registerManagedWorkflowOwner: jest.fn(),
  registerStepType: jest.fn(),
});

const createMockElasticAssistant = () => ({
  actions: {} as never,
  registerAttackDiscoveryWorkflowExecutor: jest.fn(),
});

const createMockActions = () => ({
  registerType: jest.fn(),
});

const createMockAlerting = () => ({
  registerConnectorAdapter: jest.fn(),
});

const createPluginSetupDeps = (
  overrides: Partial<DiscoveriesPluginSetupDeps> = {}
): DiscoveriesPluginSetupDeps => ({
  actions: createMockActions() as unknown as DiscoveriesPluginSetupDeps['actions'],
  alerting: createMockAlerting() as unknown as DiscoveriesPluginSetupDeps['alerting'],
  eventLog: createMockEventLog() as unknown as DiscoveriesPluginSetupDeps['eventLog'],
  ruleRegistry: createMockRuleRegistry() as unknown as DiscoveriesPluginSetupDeps['ruleRegistry'],
  workflowsExtensions:
    createMockWorkflowsExtensions() as unknown as DiscoveriesPluginSetupDeps['workflowsExtensions'],
  ...overrides,
});

const createMockWorkflowsExtensionsStart = () => ({
  initManagedWorkflowsClient: jest.fn().mockResolvedValue({
    execute: jest.fn().mockResolvedValue('mock-execution-id'),
    install: jest.fn().mockResolvedValue(undefined),
    ready: jest.fn().mockResolvedValue(undefined),
    uninstall: jest.fn().mockResolvedValue(undefined),
  }),
});

const createPluginInitializerContext = () =>
  coreMock.createPluginInitializerContext({
    enabled: true,
  });

const createPluginStartDeps = (
  overrides: Partial<DiscoveriesPluginStartDeps> = {}
): DiscoveriesPluginStartDeps => ({
  actions: {} as unknown as DiscoveriesPluginStartDeps['actions'],
  security: {} as unknown as DiscoveriesPluginStartDeps['security'],
  workflowsExtensions:
    createMockWorkflowsExtensionsStart() as unknown as DiscoveriesPluginStartDeps['workflowsExtensions'],
  ...overrides,
});

describe('DiscoveriesPlugin', () => {
  describe('setup', () => {
    describe('managed workflow owner registration', () => {
      beforeEach(() => {
        jest.clearAllMocks();
      });

      it('registers discoveries as managed workflow owner exactly once when the plugin is enabled', () => {
        const mockWorkflowsExtensions = createMockWorkflowsExtensions();
        const context = coreMock.createPluginInitializerContext({ enabled: true });
        const plugin = new DiscoveriesPlugin(context);

        plugin.setup(
          coreMock.createSetup(),
          createPluginSetupDeps({
            workflowsExtensions:
              mockWorkflowsExtensions as unknown as DiscoveriesPluginSetupDeps['workflowsExtensions'],
          })
        );

        expect(mockWorkflowsExtensions.registerManagedWorkflowOwner).toHaveBeenCalledTimes(1);
        expect(mockWorkflowsExtensions.registerManagedWorkflowOwner).toHaveBeenCalledWith(
          'discoveries'
        );
      });

      it('does not register managed workflow owner when the plugin is disabled', () => {
        const mockWorkflowsExtensions = createMockWorkflowsExtensions();
        const context = coreMock.createPluginInitializerContext({ enabled: false });
        const plugin = new DiscoveriesPlugin(context);

        plugin.setup(
          coreMock.createSetup(),
          createPluginSetupDeps({
            workflowsExtensions:
              mockWorkflowsExtensions as unknown as DiscoveriesPluginSetupDeps['workflowsExtensions'],
          })
        );

        expect(mockWorkflowsExtensions.registerManagedWorkflowOwner).not.toHaveBeenCalled();
      });
    });

    describe('workflow executor registration', () => {
      beforeEach(() => {
        jest.clearAllMocks();
      });

      it('registers the workflow executor when elasticAssistant is available', () => {
        const mockElasticAssistant = createMockElasticAssistant();
        const context = createPluginInitializerContext();
        const plugin = new DiscoveriesPlugin(context);

        const coreSetup = coreMock.createSetup();
        const deps = createPluginSetupDeps({
          elasticAssistant: mockElasticAssistant,
        });

        plugin.setup(coreSetup, deps);

        expect(mockElasticAssistant.registerAttackDiscoveryWorkflowExecutor).toHaveBeenCalledTimes(
          1
        );
        expect(mockElasticAssistant.registerAttackDiscoveryWorkflowExecutor).toHaveBeenCalledWith(
          expect.any(Function)
        );
      });

      it('does not throw when elasticAssistant is not available', () => {
        const context = createPluginInitializerContext();
        const plugin = new DiscoveriesPlugin(context);

        const coreSetup = coreMock.createSetup();
        const deps = createPluginSetupDeps();

        expect(() => plugin.setup(coreSetup, deps)).not.toThrow();
      });

      it('invokes workflowExecutor when the registered factory is called', async () => {
        const mockElasticAssistant = createMockElasticAssistant();
        const context = createPluginInitializerContext();
        const plugin = new DiscoveriesPlugin(context);

        const coreSetup = coreMock.createSetup();
        const deps = createPluginSetupDeps({
          elasticAssistant: mockElasticAssistant,
        });

        plugin.setup(coreSetup, deps);

        const factory =
          mockElasticAssistant.registerAttackDiscoveryWorkflowExecutor.mock.calls[0][0];

        const mockOptions = {
          params: { alertsIndexPattern: '.alerts-*', apiConfig: {} },
          rule: { id: 'rule-1' },
          services: { alertsClient: {} },
          spaceId: 'default',
        } as unknown as AttackDiscoveryExecutorOptions;

        const result = await factory(mockOptions);

        expect(workflowExecutor).toHaveBeenCalledTimes(1);
        expect(workflowExecutor).toHaveBeenCalledWith({
          deps: expect.objectContaining({
            getEventLogIndex: expect.any(Function),
            getEventLogger: expect.any(Function),
            getStartServices: expect.any(Function),
            logger: expect.anything(),
            request: expect.objectContaining({
              headers: expect.any(Object),
            }),
          }),
          options: mockOptions,
        });

        expect(result).toEqual({ state: {} });
      });

      it('skips the scheduled execution as a no-op when the feature flag is OFF', async () => {
        mockIsWorkflowsEnabled.mockResolvedValueOnce(false);

        const mockElasticAssistant = createMockElasticAssistant();
        const context = createPluginInitializerContext();
        const plugin = new DiscoveriesPlugin(context);

        const coreSetup = coreMock.createSetup();
        const deps = createPluginSetupDeps({
          elasticAssistant: mockElasticAssistant,
        });

        plugin.setup(coreSetup, deps);

        const factory =
          mockElasticAssistant.registerAttackDiscoveryWorkflowExecutor.mock.calls[0][0];

        const mockOptions = {
          executionId: 'exec-1',
          params: { alertsIndexPattern: '.alerts-*', apiConfig: {} },
          rule: { id: 'rule-1' },
          services: { alertsClient: {} },
          spaceId: 'default',
        } as unknown as AttackDiscoveryExecutorOptions;

        const result = await factory(mockOptions);

        expect(result).toEqual({ state: {} });
        expect(workflowExecutor).not.toHaveBeenCalled();
      });

      it('creates a fake request with authorization extracted from the scoped cluster client transport', async () => {
        const mockElasticAssistant = createMockElasticAssistant();
        const context = createPluginInitializerContext();
        const plugin = new DiscoveriesPlugin(context);

        const coreSetup = coreMock.createSetup();
        const deps = createPluginSetupDeps({
          elasticAssistant: mockElasticAssistant,
        });

        plugin.setup(coreSetup, deps);

        const factory =
          mockElasticAssistant.registerAttackDiscoveryWorkflowExecutor.mock.calls[0][0];

        const mockOptions = {
          executionId: 'exec-1',
          params: { alertsIndexPattern: '.alerts-*', apiConfig: {} },
          rule: { id: 'rule-1' },
          services: {
            alertsClient: {},
            scopedClusterClient: {
              asCurrentUser: {
                transport: {
                  headers: { authorization: 'ApiKey dGVzdC1lbmNvZGVk' },
                },
              },
            },
          },
          spaceId: 'default',
        } as unknown as AttackDiscoveryExecutorOptions;

        await factory(mockOptions);

        const passedRequest = workflowExecutor.mock.calls[0][0].deps.request;
        expect(passedRequest.headers).toEqual(
          expect.objectContaining({
            authorization: 'ApiKey dGVzdC1lbmNvZGVk',
          })
        );
      });

      it('scopes the fake request to the rule space so authorization runs against the correct space', async () => {
        const mockElasticAssistant = createMockElasticAssistant();
        const context = createPluginInitializerContext();
        const plugin = new DiscoveriesPlugin(context);

        const coreSetup = coreMock.createSetup();
        const deps = createPluginSetupDeps({
          elasticAssistant: mockElasticAssistant,
        });

        plugin.setup(coreSetup, deps);

        const factory =
          mockElasticAssistant.registerAttackDiscoveryWorkflowExecutor.mock.calls[0][0];

        const mockOptions = {
          executionId: 'exec-1',
          params: { alertsIndexPattern: '.alerts-*', apiConfig: {} },
          rule: { id: 'rule-1' },
          services: {
            alertsClient: {},
            scopedClusterClient: {
              asCurrentUser: {
                transport: { headers: { authorization: 'ApiKey dGVzdC1lbmNvZGVk' } },
              },
            },
          },
          spaceId: 'marketing',
        } as unknown as AttackDiscoveryExecutorOptions;

        await factory(mockOptions);

        const passedRequest = workflowExecutor.mock.calls[0][0].deps.request;
        expect(passedRequest.spaceId).toEqual('marketing');
      });

      it('falls back to empty headers when transport has no authorization header', async () => {
        const mockElasticAssistant = createMockElasticAssistant();
        const context = createPluginInitializerContext();
        const plugin = new DiscoveriesPlugin(context);

        const coreSetup = coreMock.createSetup();
        const deps = createPluginSetupDeps({
          elasticAssistant: mockElasticAssistant,
        });

        plugin.setup(coreSetup, deps);

        const factory =
          mockElasticAssistant.registerAttackDiscoveryWorkflowExecutor.mock.calls[0][0];

        const mockOptions = {
          executionId: 'exec-1',
          params: { alertsIndexPattern: '.alerts-*', apiConfig: {} },
          rule: { id: 'rule-1' },
          services: {
            alertsClient: {},
            scopedClusterClient: {
              asCurrentUser: {
                transport: { headers: {} },
              },
            },
          },
          spaceId: 'default',
        } as unknown as AttackDiscoveryExecutorOptions;

        await factory(mockOptions);

        expect(workflowExecutor).toHaveBeenCalledTimes(1);
        const passedRequest = workflowExecutor.mock.calls[0][0].deps.request;
        expect(passedRequest.headers.authorization).toBeUndefined();
      });

      it('creates a new request for each factory invocation', async () => {
        const mockElasticAssistant = createMockElasticAssistant();
        const context = createPluginInitializerContext();
        const plugin = new DiscoveriesPlugin(context);

        const coreSetup = coreMock.createSetup();
        const deps = createPluginSetupDeps({
          elasticAssistant: mockElasticAssistant,
        });

        plugin.setup(coreSetup, deps);

        const factory =
          mockElasticAssistant.registerAttackDiscoveryWorkflowExecutor.mock.calls[0][0];

        const mockOptions = {
          params: {},
          rule: { id: 'rule-1' },
          services: {},
          spaceId: 'default',
        } as unknown as AttackDiscoveryExecutorOptions;

        await factory(mockOptions);
        await factory(mockOptions);

        const firstRequest = workflowExecutor.mock.calls[0][0].deps.request;
        const secondRequest = workflowExecutor.mock.calls[1][0].deps.request;

        expect(firstRequest).not.toBe(secondRequest);
      });
    });

    describe('agent builder registration', () => {
      beforeEach(() => {
        jest.clearAllMocks();
      });

      it('registers agent builder skills and the attachment type when the feature flag is ON', async () => {
        const mockAgentBuilder = createMockAgentBuilder();
        const context = createPluginInitializerContext();
        const plugin = new DiscoveriesPlugin(context);

        plugin.setup(
          coreMock.createSetup(),
          createPluginSetupDeps({
            agentBuilder: mockAgentBuilder as unknown as DiscoveriesPluginSetupDeps['agentBuilder'],
          })
        );

        await flushPromises();

        expect(registerSkills).toHaveBeenCalledTimes(1);
        expect(mockAgentBuilder.attachments.registerType).toHaveBeenCalledTimes(1);
      });

      it('does not register agent builder skills or the attachment type when the feature flag is OFF', async () => {
        mockIsWorkflowsEnabled.mockResolvedValueOnce(false);

        const mockAgentBuilder = createMockAgentBuilder();
        const context = createPluginInitializerContext();
        const plugin = new DiscoveriesPlugin(context);

        plugin.setup(
          coreMock.createSetup(),
          createPluginSetupDeps({
            agentBuilder: mockAgentBuilder as unknown as DiscoveriesPluginSetupDeps['agentBuilder'],
          })
        );

        await flushPromises();

        expect(registerSkills).not.toHaveBeenCalled();
        expect(mockAgentBuilder.attachments.registerType).not.toHaveBeenCalled();
      });
    });
  });

  describe('start', () => {
    describe('managed workflow installation', () => {
      beforeEach(() => {
        jest.clearAllMocks();
      });

      it('installs the managed workflows when the plugin is enabled and the feature flag is ON', async () => {
        const mockWorkflowsExtensionsStart = createMockWorkflowsExtensionsStart();
        const context = coreMock.createPluginInitializerContext({ enabled: true });
        const plugin = new DiscoveriesPlugin(context);

        plugin.setup(coreMock.createSetup(), createPluginSetupDeps());
        plugin.start(
          coreMock.createStart(),
          createPluginStartDeps({
            workflowsExtensions:
              mockWorkflowsExtensionsStart as unknown as DiscoveriesPluginStartDeps['workflowsExtensions'],
          })
        );

        await flushPromises();

        expect(installStatic).toHaveBeenCalledTimes(1);
        expect(installStatic).toHaveBeenCalledWith({
          enabled: true,
          workflowsExtensions: mockWorkflowsExtensionsStart,
        });
      });

      it('does not install the managed workflows when the feature flag is OFF', async () => {
        mockIsWorkflowsEnabled.mockResolvedValueOnce(false);

        const mockWorkflowsExtensionsStart = createMockWorkflowsExtensionsStart();
        const context = coreMock.createPluginInitializerContext({ enabled: true });
        const plugin = new DiscoveriesPlugin(context);

        plugin.setup(coreMock.createSetup(), createPluginSetupDeps());
        plugin.start(
          coreMock.createStart(),
          createPluginStartDeps({
            workflowsExtensions:
              mockWorkflowsExtensionsStart as unknown as DiscoveriesPluginStartDeps['workflowsExtensions'],
          })
        );

        await flushPromises();

        expect(installStatic).not.toHaveBeenCalled();
      });

      it('does not install the managed workflows when the plugin is disabled', async () => {
        const mockWorkflowsExtensionsStart = createMockWorkflowsExtensionsStart();
        const context = coreMock.createPluginInitializerContext({ enabled: false });
        const plugin = new DiscoveriesPlugin(context);

        plugin.setup(coreMock.createSetup(), createPluginSetupDeps());
        plugin.start(
          coreMock.createStart(),
          createPluginStartDeps({
            workflowsExtensions:
              mockWorkflowsExtensionsStart as unknown as DiscoveriesPluginStartDeps['workflowsExtensions'],
          })
        );

        await flushPromises();

        expect(installStatic).not.toHaveBeenCalled();
      });
    });
  });
});
