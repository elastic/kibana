/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { BehaviorSubject, firstValueFrom, of } from 'rxjs';
import type { App, AppUpdater } from '@kbn/core/public';
import { coreMock } from '@kbn/core/public/mocks';
import { hasSeenOnboarding } from '@kbn/vectordb-onboarding';
import { ServerlessVectordbPlugin } from './plugin';
import { CONSOLE_DEFAULT_CONTENT } from './console_default_content';
import type { ServerlessVectordbStartDependencies } from './types';

jest.mock('@kbn/vectordb-onboarding', () => ({
  ...jest.requireActual('@kbn/vectordb-onboarding'),
  hasSeenOnboarding: jest.fn(),
}));

const mockHasSeenOnboarding = jest.mocked(hasSeenOnboarding);

const registerApp = (): App => {
  const core = coreMock.createSetup();
  new ServerlessVectordbPlugin().setup(core, {});
  return core.application.register.mock.calls[0][0];
};

const runUpdater = async (app: App): Promise<ReturnType<AppUpdater>> => {
  if (!app.updater$) {
    throw new Error('updater$ not registered');
  }
  return (await firstValueFrom(app.updater$))(app);
};

beforeEach(() => {
  jest.clearAllMocks();
  mockHasSeenOnboarding.mockReturnValue(false);
});

describe('ServerlessVectordbPlugin setup', () => {
  it('seeds Console with the vector search sample requests', () => {
    const setDefaultEditorContent = jest.fn();

    new ServerlessVectordbPlugin().setup(coreMock.createSetup(), {
      console: { setDefaultEditorContent },
    });

    expect(setDefaultEditorContent).toHaveBeenCalledWith(CONSOLE_DEFAULT_CONTENT);
  });

  it('does not fail when the console plugin is unavailable', () => {
    expect(() => new ServerlessVectordbPlugin().setup(coreMock.createSetup(), {})).not.toThrow();
  });

  describe('hideChrome', () => {
    it('hides the chrome for a first-time user', async () => {
      const app = registerApp();

      expect(await runUpdater(app)).toEqual({ hideChrome: true });
    });

    it('shows the chrome once onboarding has been seen', async () => {
      mockHasSeenOnboarding.mockReturnValue(true);
      const app = registerApp();

      expect(await runUpdater(app)).toEqual({ hideChrome: false });
    });

    it('keeps the chrome hidden when the updater re-runs after onboarding is marked seen', async () => {
      const app = registerApp();
      mockHasSeenOnboarding.mockReturnValue(true);

      expect(await runUpdater(app)).toEqual({ hideChrome: true });
    });
  });
});

describe('ServerlessVectordbPlugin start', () => {
  const startPlugin = (integratedOnboardingEnabled: boolean) => {
    const plugin = new ServerlessVectordbPlugin();
    const coreSetup = coreMock.createSetup();
    plugin.setup(coreSetup, {});
    const app: App = coreSetup.application.register.mock.calls[0][0];

    const coreStart = coreMock.createStart();
    coreStart.settings.client.get$.mockReturnValue(of('agent'));
    const integratedOnboardingEnabled$ = new BehaviorSubject(integratedOnboardingEnabled);
    plugin.start(coreStart, {
      navigation: { initNavigation: jest.fn() },
      elasticsearchHome: { getIntegratedOnboardingEnabled$: () => integratedOnboardingEnabled$ },
    } as unknown as ServerlessVectordbStartDependencies);

    return { app, integratedOnboardingEnabled$, plugin };
  };

  describe('with integrated onboarding off', () => {
    it('keeps the setup chrome state and the registered deep links', async () => {
      const { app } = startPlugin(false);

      expect(await runUpdater(app)).toEqual({ hideChrome: true });
    });
  });

  describe('with integrated onboarding on', () => {
    it('shows the chrome and drops the Getting started deep link', async () => {
      const { app } = startPlugin(true);

      expect(await runUpdater(app)).toEqual({ hideChrome: false, deepLinks: [] });
    });
  });

  it('restores the setup state when the flag turns off at runtime', async () => {
    const { app, integratedOnboardingEnabled$ } = startPlugin(true);

    integratedOnboardingEnabled$.next(false);

    expect(await runUpdater(app)).toEqual({ hideChrome: true });
  });

  it('stops following the flag once stopped', async () => {
    const { app, integratedOnboardingEnabled$, plugin } = startPlugin(false);

    plugin.stop();
    integratedOnboardingEnabled$.next(true);

    expect(await runUpdater(app)).toEqual({ hideChrome: true });
  });
});
