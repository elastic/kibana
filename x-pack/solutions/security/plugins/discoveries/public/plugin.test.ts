/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { coreMock } from '@kbn/core/public/mocks';

import { DIAGNOSTIC_REPORT_ATTACHMENT_TYPE } from '../common/constants';
import { DiscoveriesPublicPlugin } from './plugin';
import type { DiscoveriesPublicPluginSetupDeps, DiscoveriesPublicPluginStartDeps } from './types';

const createSetupDeps = (): DiscoveriesPublicPluginSetupDeps => ({
  workflowsExtensions: {
    registerStepDefinition: jest.fn(),
  } as unknown as DiscoveriesPublicPluginSetupDeps['workflowsExtensions'],
});

const createStartDeps = ({
  withAgentBuilder = false,
}: { withAgentBuilder?: boolean } = {}): DiscoveriesPublicPluginStartDeps => ({
  ...(withAgentBuilder
    ? {
        agentBuilder: {
          attachments: {
            addAttachmentType: jest.fn(),
          },
        } as unknown as NonNullable<DiscoveriesPublicPluginStartDeps['agentBuilder']>,
      }
    : {}),
});

describe('DiscoveriesPublicPlugin', () => {
  describe('setup', () => {
    // Steps are registered as feature-flag-gated loaders. This runs setup with a
    // controllable flag value and returns the registered loaders.
    const setupWithFlag = (enabled: boolean) => {
      const context = coreMock.createPluginInitializerContext();
      const plugin = new DiscoveriesPublicPlugin(context);
      const coreSetup = coreMock.createSetup();
      const coreStart = coreMock.createStart();
      (coreStart.featureFlags.getBooleanValue as jest.Mock).mockResolvedValue(enabled);
      coreSetup.getStartServices = jest.fn().mockResolvedValue([coreStart, {}, {}]);
      const setupDeps = createSetupDeps();

      plugin.setup(coreSetup, setupDeps);

      return (setupDeps.workflowsExtensions.registerStepDefinition as jest.Mock).mock.calls.map(
        ([loader]) => loader as () => Promise<{ id: string } | undefined>
      );
    };

    it('registers step definitions with workflowsExtensions', () => {
      const context = coreMock.createPluginInitializerContext();
      const plugin = new DiscoveriesPublicPlugin(context);
      const coreSetup = coreMock.createSetup();
      const setupDeps = createSetupDeps();

      plugin.setup(coreSetup, setupDeps);

      expect(setupDeps.workflowsExtensions.registerStepDefinition).toHaveBeenCalled();
    });

    it('registers five step loaders (functions)', () => {
      const loaders = setupWithFlag(true);

      expect(loaders).toHaveLength(5);
    });

    it('resolves all loaders to definitions when the feature flag is on', async () => {
      const loaders = setupWithFlag(true);

      const definitions = await Promise.all(loaders.map((loader) => loader()));

      expect(definitions.filter((definition) => definition != null)).toHaveLength(5);
    });

    it('resolves all loaders to undefined when the feature flag is off', async () => {
      const loaders = setupWithFlag(false);

      const definitions = await Promise.all(loaders.map((loader) => loader()));

      expect(definitions.every((definition) => definition === undefined)).toBe(true);
    });
  });

  describe('start', () => {
    it('registers the diagnostic report attachment type when agentBuilder is available', () => {
      const context = coreMock.createPluginInitializerContext();
      const plugin = new DiscoveriesPublicPlugin(context);
      const coreSetup = coreMock.createSetup();
      const setupDeps = createSetupDeps();
      const coreStart = coreMock.createStart();
      const startDeps = createStartDeps({ withAgentBuilder: true });

      plugin.setup(coreSetup, setupDeps);
      plugin.start(coreStart, startDeps);

      expect(startDeps.agentBuilder?.attachments.addAttachmentType).toHaveBeenCalledWith(
        DIAGNOSTIC_REPORT_ATTACHMENT_TYPE,
        expect.objectContaining({
          getIcon: expect.any(Function),
          getLabel: expect.any(Function),
        })
      );
    });

    it('returns "document" from getIcon', () => {
      const context = coreMock.createPluginInitializerContext();
      const plugin = new DiscoveriesPublicPlugin(context);
      const coreSetup = coreMock.createSetup();
      const setupDeps = createSetupDeps();
      const coreStart = coreMock.createStart();
      const startDeps = createStartDeps({ withAgentBuilder: true });

      plugin.setup(coreSetup, setupDeps);
      plugin.start(coreStart, startDeps);

      const { getIcon } = (startDeps.agentBuilder?.attachments.addAttachmentType as jest.Mock).mock
        .calls[0][1] as Record<string, () => string>;

      expect(getIcon()).toBe('document');
    });

    it('returns "Diagnostic report" from getLabel', () => {
      const context = coreMock.createPluginInitializerContext();
      const plugin = new DiscoveriesPublicPlugin(context);
      const coreSetup = coreMock.createSetup();
      const setupDeps = createSetupDeps();
      const coreStart = coreMock.createStart();
      const startDeps = createStartDeps({ withAgentBuilder: true });

      plugin.setup(coreSetup, setupDeps);
      plugin.start(coreStart, startDeps);

      const { getLabel } = (startDeps.agentBuilder?.attachments.addAttachmentType as jest.Mock).mock
        .calls[0][1] as Record<string, () => string>;

      expect(getLabel()).toBe('Diagnostic report');
    });

    it('does not throw when agentBuilder is not available', () => {
      const context = coreMock.createPluginInitializerContext();
      const plugin = new DiscoveriesPublicPlugin(context);
      const coreSetup = coreMock.createSetup();
      const setupDeps = createSetupDeps();
      const coreStart = coreMock.createStart();
      const startDeps = createStartDeps({ withAgentBuilder: false });

      plugin.setup(coreSetup, setupDeps);

      expect(() => plugin.start(coreStart, startDeps)).not.toThrow();
    });
  });
});
