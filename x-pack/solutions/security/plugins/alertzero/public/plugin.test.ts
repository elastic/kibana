/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { coreMock } from '@kbn/core/public/mocks';
import { agentBuilderMocks } from '@kbn/agent-builder-plugin/public/mocks';
import { getInvestigationTabIds } from '@kbn/agentic-investigations-common';
import type { AlertZeroClientConfig } from './types';
import { AlertZeroPublicPlugin } from './plugin';

const createConfig = (overrides: Partial<AlertZeroClientConfig> = {}): AlertZeroClientConfig => ({
  enabled: false,
  ui: { useMockData: true },
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
  // Registration is kicked off as a floating promise in start(), so let the dynamic
  // imports and the getActiveSpace await settle before asserting.
  const flushRegistration = () => new Promise((resolve) => setTimeout(resolve, 0));

  const startPlugin = ({
    enabled = true,
    spaces,
  }: {
    enabled?: boolean;
    spaces?: { getActiveSpace: jest.Mock };
  } = {}) => {
    const plugin = new AlertZeroPublicPlugin(createContext(createConfig({ enabled })));
    const agentBuilder = agentBuilderMocks.createStart();

    plugin.start(coreMock.createStart(), { agentBuilder, spaces } as never);

    return agentBuilder;
  };

  it('registers the three Hunt Watch attachment types', async () => {
    const { attachments } = startPlugin();
    await flushRegistration();

    expect(attachments.addAttachmentType).toHaveBeenCalledTimes(3);
    expect(attachments.addAttachmentType.mock.calls.map(([type]) => type).sort()).toEqual([
      'security.hunt_correlation',
      'security.significant_security_event',
      'security.threat',
    ]);
  });

  it('registers against the active space when spaces is available', async () => {
    const spaces = { getActiveSpace: jest.fn().mockResolvedValue({ id: 'soc' }) };
    const { attachments } = startPlugin({ spaces });
    await flushRegistration();

    expect(spaces.getActiveSpace).toHaveBeenCalled();
    expect(attachments.addAttachmentType).toHaveBeenCalledTimes(3);
  });

  it('registers nothing when the active space cannot be resolved', async () => {
    const spaces = { getActiveSpace: jest.fn().mockRejectedValue(new Error('no space')) };
    const { attachments } = startPlugin({ spaces });
    await flushRegistration();

    // Fail closed: registering with a guessed 'default' space would build alert-index
    // links pointing at the wrong space's alerts index.
    expect(attachments.addAttachmentType).not.toHaveBeenCalled();
  });

  it('registers nothing when disabled', async () => {
    const { attachments } = startPlugin({ enabled: false });
    await flushRegistration();

    expect(attachments.addAttachmentType).not.toHaveBeenCalled();
  });
});
