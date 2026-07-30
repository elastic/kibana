/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { coreMock, httpServerMock } from '@kbn/core/server/mocks';
import { loggerMock } from '@kbn/logging-mocks';
import type { PndConfig } from './config';
import { PndPlugin } from './plugin';
import { installStatic } from './managed_workflows/install_static';
import { registerOwner } from './managed_workflows/register_owner';
import { registerRoutes } from './routes/register_routes';

const httpServerRequest = () => httpServerMock.createKibanaRequest();

jest.mock('./managed_workflows/register_owner', () => ({
  registerOwner: jest.fn(),
}));

jest.mock('./managed_workflows/install_static', () => ({
  installStatic: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('./routes/register_routes', () => ({
  registerRoutes: jest.fn(),
}));

const createConfig = (overrides: Partial<PndConfig> = {}): PndConfig => ({
  enabled: false,
  ui: { useMockData: true },
  conversationShadowWrite: false,
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
    });

    it('does not install managed watch workflows on start', () => {
      const plugin = new PndPlugin(createContext(createConfig({ enabled: false })));
      const coreStart = coreMock.createStart();

      plugin.start(coreStart, {
        spaces: undefined,
        workflowsExtensions: { initManagedWorkflowsClient: jest.fn() },
      } as never);

      expect(installStatic).not.toHaveBeenCalled();
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
    });

    it('registers the pnd-watch-orchestrator agent with Agent Builder during setup', () => {
      const plugin = new PndPlugin(createContext(createConfig({ enabled: true })));
      const coreSetup = coreMock.createSetup();
      const features = { registerKibanaFeature: jest.fn() };
      const workflowsExtensions = { registerManagedWorkflowOwner: jest.fn() };
      const register = jest.fn();

      plugin.setup(
        coreSetup as never,
        {
          features,
          workflowsExtensions,
          workflowsManagement: { management: {} },
          agentBuilder: { agents: { register } },
        } as never
      );

      expect(register).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'security.pnd_watch_orchestrator' })
      );
    });

    it('does not throw when agentBuilder is unavailable during setup', () => {
      const plugin = new PndPlugin(createContext(createConfig({ enabled: true })));
      const coreSetup = coreMock.createSetup();
      const features = { registerKibanaFeature: jest.fn() };
      const workflowsExtensions = { registerManagedWorkflowOwner: jest.fn() };

      expect(() =>
        plugin.setup(
          coreSetup as never,
          {
            features,
            workflowsExtensions,
            workflowsManagement: { management: {} },
            agentBuilder: undefined,
          } as never
        )
      ).not.toThrow();
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

    it('resolves a scoped conversation client through the deferred agentBuilder getter once start() wires it up', async () => {
      const plugin = new PndPlugin(createContext(createConfig({ enabled: true })));
      const coreSetup = coreMock.createSetup();
      const features = { registerKibanaFeature: jest.fn() };
      const workflowsExtensions = { registerManagedWorkflowOwner: jest.fn() };

      // setup() registers routes with a getConversationClient closure that
      // reads `this.agentBuilder` lazily — capture it here, before
      // agentBuilder is actually assigned in start().
      plugin.setup(
        coreSetup as never,
        {
          features,
          workflowsExtensions,
          workflowsManagement: { management: {} },
        } as never
      );

      const { getConversationClient } = (registerRoutes as jest.Mock).mock.calls[0][0];
      // Before start(), this.agentBuilder is still undefined.
      expect(getConversationClient(httpServerRequest())).toBeUndefined();

      const scopedClient = { some: 'client' };
      const getScopedClient = jest.fn().mockReturnValue(scopedClient);
      const coreStart = coreMock.createStart();

      plugin.start(coreStart, {
        spaces: undefined,
        workflowsExtensions: { initManagedWorkflowsClient: jest.fn() },
        agentBuilder: { conversations: { getScopedClient, getScopedWriterClient: jest.fn() } },
      } as never);

      const request = httpServerRequest();
      expect(getConversationClient(request)).toBe(scopedClient);
      expect(getScopedClient).toHaveBeenCalledWith({ request });
    });

    it('degrades getConversationClient to undefined when agentBuilder is unavailable', () => {
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

      const { getConversationClient } = (registerRoutes as jest.Mock).mock.calls[0][0];

      const coreStart = coreMock.createStart();
      // agentBuilder plugin not enabled — start() leaves it undefined.
      plugin.start(coreStart, {
        spaces: undefined,
        workflowsExtensions: { initManagedWorkflowsClient: jest.fn() },
        agentBuilder: undefined,
      } as never);

      expect(() => getConversationClient(httpServerRequest())).not.toThrow();
      expect(getConversationClient(httpServerRequest())).toBeUndefined();
    });
  });
});
