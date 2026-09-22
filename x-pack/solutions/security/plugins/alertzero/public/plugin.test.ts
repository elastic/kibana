/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { coreMock } from '@kbn/core/public/mocks';
import { AppStatus, type AppUpdater } from '@kbn/core/public';
import { agentBuilderMocks } from '@kbn/agent-builder-plugin/public/mocks';
import { getInvestigationTabIds } from '@kbn/agentic-investigations-common';
import { BehaviorSubject, firstValueFrom, type Observable } from 'rxjs';
import { ALERTZERO_ENABLED_SETTING_ID } from '@kbn/alertzero-common';
import type { AlertZeroClientConfig } from './types';
import { AlertZeroPublicPlugin } from './plugin';

const createConfig = (overrides: Partial<AlertZeroClientConfig> = {}): AlertZeroClientConfig => ({
  enabled: false,
  ...overrides,
});

const createContext = (config: AlertZeroClientConfig) =>
  ({
    config: { get: () => config },
  } as unknown as ConstructorParameters<typeof AlertZeroPublicPlugin>[0]);

/** `coreMock` returns a plain jest mock for `get$`; wire it to the setting under test. */
const withSetting = (
  core: ReturnType<typeof coreMock.createStart>,
  setting$: Observable<boolean>
) => {
  (core.uiSettings.get$ as jest.Mock).mockImplementation((id: string) => {
    if (id !== ALERTZERO_ENABLED_SETTING_ID) {
      throw new Error(`Unexpected uiSetting read: ${id}`);
    }
    return setting$;
  });
  return core;
};

describe('AlertZeroPublicPlugin app registration', () => {
  const setupPlugin = (setting$: Observable<boolean>, enabled = true) => {
    const plugin = new AlertZeroPublicPlugin(createContext(createConfig({ enabled })));
    const coreSetup = coreMock.createSetup();
    coreSetup.getStartServices.mockResolvedValue([
      withSetting(coreMock.createStart(), setting$),
      {},
      {},
    ] as never);

    plugin.setup(coreSetup as never, {} as never);

    return coreSetup;
  };

  it('does not register the browser app when the deployment kill switch is off', () => {
    const coreSetup = setupPlugin(new BehaviorSubject(true), false);

    expect(coreSetup.application.register).not.toHaveBeenCalled();
  });

  it('registers the browser app as inaccessible so core strips its nav and deep links', () => {
    const coreSetup = setupPlugin(new BehaviorSubject(false));

    expect(coreSetup.application.register).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'alertzero',
        appRoute: '/app/alertzero',
        status: AppStatus.inaccessible,
      })
    );
  });

  const nextStatus = async (setting$: Observable<boolean>) => {
    const coreSetup = setupPlugin(setting$);
    const { updater$ } = (coreSetup.application.register as jest.Mock).mock.calls[0][0] as {
      updater$: Observable<AppUpdater>;
    };
    const updater = await firstValueFrom(updater$);
    return updater({} as never)?.status;
  };

  it('flips the app to accessible while the setting is on', async () => {
    expect(await nextStatus(new BehaviorSubject(true))).toBe(AppStatus.accessible);
  });

  it('keeps the app inaccessible while the setting is off', async () => {
    expect(await nextStatus(new BehaviorSubject(false))).toBe(AppStatus.inaccessible);
  });

  it('tracks later changes to the setting without a page reload', async () => {
    const setting$ = new BehaviorSubject(false);
    const coreSetup = setupPlugin(setting$);
    const { updater$ } = (coreSetup.application.register as jest.Mock).mock.calls[0][0] as {
      updater$: Observable<AppUpdater>;
    };

    const statuses: Array<AppStatus | undefined> = [];
    const subscription = updater$.subscribe((updater) =>
      statuses.push(updater({} as never)?.status)
    );
    // The updater only subscribes once `getStartServices` resolves.
    await Promise.resolve();
    await Promise.resolve();
    setting$.next(true);
    subscription.unsubscribe();

    expect(statuses).toEqual([AppStatus.inaccessible, AppStatus.accessible]);
  });
});

describe('AlertZeroPublicPlugin conversation template UI registration', () => {
  const startPlugin = (setting$: Observable<boolean>, enabled = true) => {
    const plugin = new AlertZeroPublicPlugin(createContext(createConfig({ enabled })));
    const agentBuilder = agentBuilderMocks.createStart();

    plugin.start(withSetting(coreMock.createStart(), setting$), { agentBuilder } as never);

    return { agentBuilder, plugin };
  };

  it('registers the investigation template UI and its tabs when the setting is on', () => {
    const { agentBuilder } = startPlugin(new BehaviorSubject(true));
    const { conversationTemplates } = agentBuilder;

    expect(conversationTemplates.registerTemplateUIDefinition).toHaveBeenCalledWith(
      'investigation',
      expect.any(Function)
    );
    for (const tabId of getInvestigationTabIds('investigation')) {
      expect(conversationTemplates.registerTab).toHaveBeenCalledWith(tabId, expect.any(Function));
    }
  });

  it('registers nothing while the setting is off', () => {
    const { agentBuilder } = startPlugin(new BehaviorSubject(false));

    expect(agentBuilder.conversationTemplates.registerTemplateUIDefinition).not.toHaveBeenCalled();
    expect(agentBuilder.conversationTemplates.registerTab).not.toHaveBeenCalled();
  });

  it('registers once the setting is turned on, and only once', () => {
    const setting$ = new BehaviorSubject(false);
    const { agentBuilder } = startPlugin(setting$);

    setting$.next(true);
    setting$.next(false);
    setting$.next(true);

    expect(agentBuilder.conversationTemplates.registerTemplateUIDefinition).toHaveBeenCalledTimes(
      1
    );
  });

  it('registers nothing when the deployment kill switch is off', () => {
    const { agentBuilder } = startPlugin(new BehaviorSubject(true), false);

    expect(agentBuilder.conversationTemplates.registerTemplateUIDefinition).not.toHaveBeenCalled();
  });
});
