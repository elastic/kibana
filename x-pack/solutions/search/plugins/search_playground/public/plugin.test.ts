/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { BehaviorSubject, type Observable } from 'rxjs';
import { AppStatus, type AppUpdater } from '@kbn/core/public';
import { coreMock } from '@kbn/core/public/mocks';
import { licensingMock } from '@kbn/licensing-plugin/public/mocks';
import { sharePluginMock } from '@kbn/share-plugin/public/mocks';
import { PLAYGROUND_ENABLED_SETTING_ID, PLUGIN_ID } from '../common';
import { SearchPlaygroundPlugin } from './plugin';
import type { AppPluginSetupDependencies, AppPluginStartDependencies } from './types';

describe('SearchPlaygroundPlugin', () => {
  const enabledSetting$ = new BehaviorSubject(true);
  let plugin: SearchPlaygroundPlugin;
  let coreSetup: ReturnType<typeof coreMock.createSetup>;
  let coreStart: ReturnType<typeof coreMock.createStart>;

  const getRegisteredUpdater$ = (): Observable<AppUpdater> => {
    const [app] = coreSetup.application.register.mock.calls[0];
    if (!app.updater$) {
      throw new Error('expected the app to be registered with an updater$');
    }
    return app.updater$;
  };

  const trackAppStatus = (updater$: Observable<AppUpdater>): (() => AppStatus | undefined) => {
    let status: AppStatus | undefined;
    updater$.subscribe((updater) => {
      status = updater({ id: PLUGIN_ID, title: 'Playground', mount: jest.fn() })?.status;
    });
    return () => status;
  };

  beforeEach(() => {
    enabledSetting$.next(true);
    const initializerContext = coreMock.createPluginInitializerContext({ ui: { enabled: true } });
    plugin = new SearchPlaygroundPlugin(initializerContext);
    coreSetup = coreMock.createSetup();
    coreStart = coreMock.createStart();
    coreStart.uiSettings.get$.mockReturnValue(enabledSetting$);
  });

  afterEach(() => {
    plugin.stop();
  });

  it('registers the Playground app with an updater', () => {
    plugin.setup(coreSetup, {
      share: sharePluginMock.createSetupContract(),
    } as unknown as AppPluginSetupDependencies);

    expect(coreSetup.application.register).toHaveBeenCalledWith(
      expect.objectContaining({ id: PLUGIN_ID, updater$: expect.anything() })
    );
  });

  it(`makes the app inaccessible while ${PLAYGROUND_ENABLED_SETTING_ID} is off`, () => {
    plugin.setup(coreSetup, {
      share: sharePluginMock.createSetupContract(),
    } as unknown as AppPluginSetupDependencies);
    const getAppStatus = trackAppStatus(getRegisteredUpdater$());

    plugin.start(coreStart, {
      licensing: licensingMock.createStart(),
    } as unknown as AppPluginStartDependencies);

    expect(coreStart.uiSettings.get$).toHaveBeenCalledWith(PLAYGROUND_ENABLED_SETTING_ID, false);
    expect(getAppStatus()).toBe(AppStatus.accessible);

    enabledSetting$.next(false);
    expect(getAppStatus()).toBe(AppStatus.inaccessible);

    enabledSetting$.next(true);
    expect(getAppStatus()).toBe(AppStatus.accessible);
  });
});
