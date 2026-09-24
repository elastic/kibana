/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { coreMock } from '@kbn/core/public/mocks';
import { httpServiceMock } from '@kbn/core-http-browser-mocks';
import type { SharePluginStart } from '@kbn/share-plugin/public';
import { agentBuilderMocks } from '@kbn/agent-builder-plugin/public/mocks';
import { getInvestigationTabIds } from '@kbn/agentic-investigations-common';
import type { AlertZeroClientConfig } from './types';
import { AlertZeroPublicPlugin } from './plugin';

const createConfig = (overrides: Partial<AlertZeroClientConfig> = {}): AlertZeroClientConfig => ({
  enabled: false,
  ...overrides,
});

const createContext = (config: AlertZeroClientConfig) =>
  coreMock.createPluginInitializerContext(config) as unknown as ConstructorParameters<
    typeof AlertZeroPublicPlugin
  >[0];

describe('AlertZeroPublicPlugin feature-flag gating', () => {
  it('does not register the browser app when disabled', () => {
    const plugin = new AlertZeroPublicPlugin(createContext(createConfig({ enabled: false })));
    const coreSetup = coreMock.createSetup();

    plugin.setup(coreSetup as never, {} as never);

    expect(coreSetup.application.register).not.toHaveBeenCalled();
  });

  it('registers the browser app when enabled', () => {
    const plugin = new AlertZeroPublicPlugin(createContext(createConfig({ enabled: true })));
    const coreSetup = coreMock.createSetup();

    plugin.setup(coreSetup as never, {} as never);

    expect(coreSetup.application.register).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'alertzero', appRoute: '/app/alertzero' })
    );
  });
});

describe('AlertZeroPublicPlugin conversation template UI registration', () => {
  const startPlugin = (enabled: boolean) => {
    const plugin = new AlertZeroPublicPlugin(createContext(createConfig({ enabled })));
    const agentBuilder = agentBuilderMocks.createStart();

    plugin.start(coreMock.createStart(), { agentBuilder } as never);

    return agentBuilder;
  };

  it('registers the investigation template UI and its tabs when enabled', () => {
    const { conversationTemplates } = startPlugin(true);

    expect(conversationTemplates.registerTemplateUIDefinition).toHaveBeenCalledWith(
      'investigation',
      expect.any(Function)
    );
    for (const tabId of getInvestigationTabIds('investigation')) {
      expect(conversationTemplates.registerTab).toHaveBeenCalledWith(tabId, expect.any(Function));
    }
  });

  it('registers nothing when disabled', () => {
    const { conversationTemplates } = startPlugin(false);

    expect(conversationTemplates.registerTemplateUIDefinition).not.toHaveBeenCalled();
    expect(conversationTemplates.registerTab).not.toHaveBeenCalled();
  });
});

describe('AlertZeroPublicPlugin attachment UI registration', () => {
  // The registrars use `await import(...)` to keep these renderers out of the initial
  // bundle, so registration is still a floating promise; let it settle before asserting.
  const flushRegistration = () => new Promise((resolve) => setTimeout(resolve, 0));

  const startPlugin = ({
    enabled = true,
    basePath,
    share,
  }: {
    enabled?: boolean;
    basePath?: string;
    share?: SharePluginStart;
  } = {}) => {
    const plugin = new AlertZeroPublicPlugin(createContext(createConfig({ enabled })));
    const agentBuilder = agentBuilderMocks.createStart();
    const core = coreMock.createStart();
    if (basePath !== undefined) {
      // `getSpaceIdFromPath` reads the space from what follows `serverBasePath`, so the two
      // must differ the way they do in a real non-default space.
      const mockBasePath = httpServiceMock.createBasePath({ serverBasePath: '' });
      mockBasePath.get.mockReturnValue(basePath);
      // The core start mock types this as the concrete `BasePath` class, but the plugin only
      // reads the `IBasePath` surface the mock implements.
      core.http.basePath = mockBasePath as unknown as typeof core.http.basePath;
    }

    plugin.start(core, { agentBuilder, share } as never);

    return agentBuilder;
  };

  it('registers the Hunt Watch attachment types', async () => {
    const { attachments } = startPlugin();
    await flushRegistration();

    expect(attachments.addAttachmentType).toHaveBeenCalledTimes(1);
    expect(attachments.addAttachmentType.mock.calls.map(([type]) => type).sort()).toEqual([
      'security.threat',
    ]);
  });

  it('derives the space id from the base path so registration never waits on a round trip', async () => {
    // A non-default space is carried by the base path as `/s/<id>`, and that id scopes the
    // threat-report lookup, so assert it reaches the ES|QL the action button is built from.
    const locator = { getRedirectUrl: jest.fn().mockReturnValue('/app/discover#/?x=1') };
    const share = {
      url: { locators: { get: jest.fn().mockReturnValue(locator) } },
    } as unknown as SharePluginStart;

    const { attachments } = startPlugin({ basePath: '/s/soc', share });
    await flushRegistration();

    const [, threatDefinition] =
      attachments.addAttachmentType.mock.calls.find(([type]) => type === 'security.threat') ?? [];
    threatDefinition?.getActionButtons?.({
      attachment: { id: 'a-1', type: 'security.threat', data: { report_id: 'report-7' } },
    } as never);

    expect(locator.getRedirectUrl).toHaveBeenCalledWith(
      expect.objectContaining({
        query: expect.objectContaining({
          esql: expect.stringContaining('space_id IN ("soc", "*")'),
        }),
      })
    );
  });

  it('registers nothing when disabled', async () => {
    const { attachments } = startPlugin({ enabled: false });
    await flushRegistration();

    expect(attachments.addAttachmentType).not.toHaveBeenCalled();
  });
});
