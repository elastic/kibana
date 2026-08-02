/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { coreMock } from '@kbn/core/server/mocks';
import { loggerMock } from '@kbn/logging-mocks';
import type { PndConfig } from './config';
import { PND_API_PRIVILEGE_READ, PND_API_PRIVILEGE_WRITE } from '../common/constants';
import { PndPlugin } from './plugin';
import { initializeManagedWorkflows } from './managed_workflows/initialize_managed_workflows';
import { registerOwner } from './managed_workflows/register_owner';
import { registerRoutes } from './routes/register_routes';

jest.mock('./managed_workflows/register_owner', () => ({
  registerOwner: jest.fn(),
}));

jest.mock('./managed_workflows/initialize_managed_workflows', () => ({
  initializeManagedWorkflows: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('./routes/register_routes', () => ({
  registerRoutes: jest.fn(),
}));

const createConfig = (overrides: Partial<PndConfig> = {}): PndConfig => ({
  // Mirror the shipped default: the assessment is the model's, never forced.
  demo: { forceIncident: false },
  enabled: false,
  // Mirror the shipped default: live projection, not mock fixtures.
  ui: { useMockData: false },
  ...overrides,
});

const createContext = (config: PndConfig, logger = loggerMock.create()) => {
  const context = {
    logger: { get: () => logger },
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
      const workflowsExtensions = {
        registerManagedWorkflowOwner: jest.fn(),
        registerTriggerDefinition: jest.fn(),
      };

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
    });

    it('does not register any trigger definition', () => {
      const plugin = new PndPlugin(createContext(createConfig({ enabled: false })));
      const coreSetup = coreMock.createSetup();
      const workflowsExtensions = {
        registerManagedWorkflowOwner: jest.fn(),
        registerTriggerDefinition: jest.fn(),
      };

      plugin.setup(
        coreSetup as never,
        {
          features: { registerKibanaFeature: jest.fn() },
          workflowsExtensions,
          workflowsManagement: undefined,
        } as never
      );

      expect(workflowsExtensions.registerTriggerDefinition).not.toHaveBeenCalled();
    });

    it('does not install managed workflows on start', () => {
      const plugin = new PndPlugin(createContext(createConfig({ enabled: false })));
      const coreStart = coreMock.createStart();

      plugin.start(coreStart, {
        spaces: undefined,
        workflowsExtensions: { initManagedWorkflowsClient: jest.fn() },
      } as never);

      expect(initializeManagedWorkflows).not.toHaveBeenCalled();
    });
  });

  describe('when xpack.pnd.enabled is true', () => {
    it('registers ownership, feature privileges, and routes during setup', () => {
      const plugin = new PndPlugin(createContext(createConfig({ enabled: true })));
      const coreSetup = coreMock.createSetup();
      const features = { registerKibanaFeature: jest.fn() };
      const workflowsExtensions = {
        registerManagedWorkflowOwner: jest.fn(),
        registerTriggerDefinition: jest.fn(),
      };

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
    });

    it('registers the pnd.incidentClosed trigger definition during setup (P3/D14)', () => {
      const plugin = new PndPlugin(createContext(createConfig({ enabled: true })));
      const coreSetup = coreMock.createSetup();
      const features = { registerKibanaFeature: jest.fn() };
      const workflowsExtensions = {
        registerManagedWorkflowOwner: jest.fn(),
        registerTriggerDefinition: jest.fn(),
      };

      plugin.setup(
        coreSetup as never,
        { features, workflowsExtensions, workflowsManagement: { management: {} } } as never
      );

      expect(workflowsExtensions.registerTriggerDefinition).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'pnd.incidentClosed' })
      );
    });

    it('registers the security.detectionChangeSignal trigger definition during setup', () => {
      const plugin = new PndPlugin(createContext(createConfig({ enabled: true })));
      const coreSetup = coreMock.createSetup();
      const features = { registerKibanaFeature: jest.fn() };
      const workflowsExtensions = {
        registerManagedWorkflowOwner: jest.fn(),
        registerTriggerDefinition: jest.fn(),
      };

      plugin.setup(
        coreSetup as never,
        { features, workflowsExtensions, workflowsManagement: { management: {} } } as never
      );

      expect(workflowsExtensions.registerTriggerDefinition).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'security.detectionChangeSignal' })
      );
    });

    it('registers the space-scoped autonomy uiSettings during setup', () => {
      const plugin = new PndPlugin(createContext(createConfig({ enabled: true })));
      const coreSetup = coreMock.createSetup();
      const features = { registerKibanaFeature: jest.fn() };

      plugin.setup(
        coreSetup as never,
        {
          features,
          workflowsExtensions: {
            registerManagedWorkflowOwner: jest.fn(),
            registerTriggerDefinition: jest.fn(),
          },
          workflowsManagement: { management: {} },
        } as never
      );

      expect(coreSetup.uiSettings.register).toHaveBeenCalledWith(
        expect.objectContaining({ 'pnd:autonomy:system-security-watch-deep': expect.any(Object) })
      );
    });

    it('registers the manage-autonomy sub-feature privilege independently of "all"', () => {
      const plugin = new PndPlugin(createContext(createConfig({ enabled: true })));
      const coreSetup = coreMock.createSetup();
      const features = { registerKibanaFeature: jest.fn() };

      plugin.setup(
        coreSetup as never,
        {
          features,
          workflowsExtensions: {
            registerManagedWorkflowOwner: jest.fn(),
            registerTriggerDefinition: jest.fn(),
          },
          workflowsManagement: { management: {} },
        } as never
      );

      const [{ subFeatures }] = features.registerKibanaFeature.mock.calls[0];
      const [privilege] = subFeatures[0].privilegeGroups[0].privileges;

      expect(privilege).toEqual(
        expect.objectContaining({
          api: ['pnd_autonomy_write'],
          id: 'pnd_manage_autonomy',
          includeIn: 'none',
        })
      );
    });

    it('installs managed workflows during start', () => {
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

    it('builds the watches service on start when useMockData is false', () => {
      const plugin = new PndPlugin(createContext(createConfig({ enabled: true })));

      plugin.setup(
        coreMock.createSetup() as never,
        {
          features: { registerKibanaFeature: jest.fn() },
          workflowsExtensions: {
            registerManagedWorkflowOwner: jest.fn(),
            registerTriggerDefinition: jest.fn(),
          },
          workflowsManagement: { management: {} },
        } as never
      );

      plugin.start(coreMock.createStart(), {
        spaces: undefined,
        workflowsExtensions: { initManagedWorkflowsClient: jest.fn() },
      } as never);

      const [{ getWatchesService }] = (registerRoutes as jest.Mock).mock.calls[0];

      expect(getWatchesService()).toBeDefined();
    });

    // The store backs settings whether or not Workflows is available, so the service is built in
    // both modes — unlike the projection service it replaced, which existed only in live mode.
    it('builds the watches service on start when useMockData is true', () => {
      const plugin = new PndPlugin(
        createContext(createConfig({ enabled: true, ui: { useMockData: true } }))
      );

      plugin.setup(
        coreMock.createSetup() as never,
        {
          features: { registerKibanaFeature: jest.fn() },
          workflowsExtensions: {
            registerManagedWorkflowOwner: jest.fn(),
            registerTriggerDefinition: jest.fn(),
          },
          workflowsManagement: { management: {} },
        } as never
      );

      plugin.start(coreMock.createStart(), {
        spaces: undefined,
        workflowsExtensions: { initManagedWorkflowsClient: jest.fn() },
      } as never);

      const [{ getWatchesService }] = (registerRoutes as jest.Mock).mock.calls[0];

      expect(getWatchesService()).toBeDefined();
    });
  });
});

// Finding R3: `[kibana-pnd]` appeared **zero** times in PND server source against 32 `logger.*`
// calls, so the `grep -a '[kibana-pnd]'` the README documents as *the* way to debug this plugin
// could never match. The plugin constructor is the single source of every logger the PND server
// hands out, so wrapping it there is what makes the marker unforgettable at new call sites.
describe('PndPlugin logging', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('stamps the [kibana-pnd] marker on the logger every PND server call site receives', () => {
    const logger = loggerMock.create();
    const plugin = new PndPlugin(createContext(createConfig({ enabled: false }), logger));

    plugin.setup(
      coreMock.createSetup() as never,
      {
        features: { registerKibanaFeature: jest.fn() },
        workflowsExtensions: {
          registerManagedWorkflowOwner: jest.fn(),
          registerTriggerDefinition: jest.fn(),
        },
        workflowsManagement: undefined,
      } as never
    );

    expect(loggerMock.collect(logger).info).toEqual([['[kibana-pnd] PND plugin is disabled']]);
  });

  it('hands the same prefixed logger to every route', () => {
    const logger = loggerMock.create();
    const plugin = new PndPlugin(createContext(createConfig({ enabled: true }), logger));

    plugin.setup(
      coreMock.createSetup() as never,
      {
        features: { registerKibanaFeature: jest.fn() },
        workflowsExtensions: {
          registerManagedWorkflowOwner: jest.fn(),
          registerTriggerDefinition: jest.fn(),
        },
        workflowsManagement: { management: {} },
      } as never
    );
    const [{ logger: routeLogger }] = (registerRoutes as jest.Mock).mock.calls[0];
    routeLogger.error('something happened');

    expect(loggerMock.collect(logger).error).toEqual([['[kibana-pnd] something happened']]);
  });
});
