/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Subject } from 'rxjs';
import type { App, AppDeepLink, AppUpdater } from '@kbn/core/public';
import { coreMock } from '@kbn/core/public/mocks';
import type { ILicense } from '@kbn/licensing-types';
import { licensingMock } from '@kbn/licensing-plugin/public/mocks';
import {
  ALERTS_FEATURE_ID,
  ALERTS_UI_DETECTIONS,
  ALERTS_UI_READ,
} from '@kbn/security-solution-features/constants';

import { APP_UI_ID, SECURITY_FEATURE_ID } from '../common/constants';
import { SecurityPageName } from './app/types';
import { appLinks, getFilteredLinks } from './app/links';
import { manageOldSiemRoutes } from './helpers';
import { Plugin } from './plugin';
import type { SetupPlugins, StartPlugins } from './types';

jest.mock('./plugin_services', () => ({
  PluginServices: jest.fn().mockImplementation(() => ({
    setup: jest.fn(),
    start: jest.fn(),
    stop: jest.fn(),
    generateServices: jest.fn(),
    aiRuleCreation: { saveRuleRequest$: new (jest.requireActual('rxjs').Subject)() },
  })),
}));

jest.mock('./helpers');

jest.mock('./app/links', () => ({
  ...jest.requireActual('./app/links'),
  getFilteredLinks: jest.fn(),
}));

const LEGACY_SIEM_APP_ID = 'siem';

const startPlugin = ({ accessible = true }: { accessible?: boolean } = {}) => {
  const coreSetup = coreMock.createSetup();
  const coreStart = coreMock.createStart();

  coreStart.application.capabilities = {
    ...coreStart.application.capabilities,
    ...(accessible
      ? {
          [SECURITY_FEATURE_ID]: { show: true },
          [ALERTS_FEATURE_ID]: { [ALERTS_UI_READ]: true, [ALERTS_UI_DETECTIONS]: true },
        }
      : {}),
  };
  coreSetup.getStartServices.mockResolvedValue([coreStart, {} as never, {} as never]);

  const license$ = new Subject<ILicense>();

  const setupPlugins = {
    licensing: { license$ },
    management: { sections: { section: { ai: { registerApp: jest.fn(), getApp: jest.fn() } } } },
    cases: { attachmentFramework: { registerAttachment: jest.fn() } },
    discoverShared: { features: { registry: { register: jest.fn() } } },
  } as unknown as SetupPlugins;

  const plugin = new Plugin(
    coreMock.createPluginInitializerContext(
      { enableExperimental: [] },
      { buildFlavor: 'traditional' }
    )
  );

  plugin.setup(coreSetup, setupPlugins);

  const registeredApps = coreSetup.application.register.mock.calls.map(([app]) => app as App);
  const legacySiemApp = registeredApps.find(({ id }) => id === LEGACY_SIEM_APP_ID)!;
  const securityApp = registeredApps.find(({ id }) => id === APP_UI_ID)!;

  const registeredDeepLinks: AppDeepLink[][] = [];
  (securityApp.updater$ as Subject<AppUpdater>).subscribe((updater) => {
    const deepLinks = updater(securityApp)?.deepLinks;
    if (deepLinks != null) {
      registeredDeepLinks.push(deepLinks);
    }
  });

  plugin.start(coreStart, { licensing: { license$ } } as unknown as StartPlugins);

  return { legacySiemApp, license$, registeredDeepLinks };
};

const mountLegacySiemApp = (legacySiemApp: App) =>
  legacySiemApp.mount({} as Parameters<App['mount']>[0]);

describe('Security Solution plugin', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    (getFilteredLinks as jest.Mock).mockResolvedValue(appLinks);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('legacy `siem` app', () => {
    it('redirects only once the deepLinks it resolves the legacy route with are registered', async () => {
      const { legacySiemApp, license$, registeredDeepLinks } = startPlugin();
      void mountLegacySiemApp(legacySiemApp);

      // The links are only processed once the license resolves, which can outlast the debounce
      // of the deepLinks updater. Nothing must be registered, nor redirected, until then.
      await jest.advanceTimersByTimeAsync(1000);

      expect(registeredDeepLinks).toHaveLength(0);
      expect(manageOldSiemRoutes).not.toHaveBeenCalled();

      license$.next(licensingMock.createLicense({ license: { type: 'platinum' } }));
      await jest.advanceTimersByTimeAsync(1000);

      expect(manageOldSiemRoutes).toHaveBeenCalledTimes(1);
      const deepLinkIds = registeredDeepLinks[registeredDeepLinks.length - 1].map(({ id }) => id);
      expect(deepLinkIds).toContain(SecurityPageName.alerts);
    });

    it('redirects when the Security Solution app is not accessible and no deepLink is registered', async () => {
      const { legacySiemApp, license$, registeredDeepLinks } = startPlugin({ accessible: false });
      void mountLegacySiemApp(legacySiemApp);

      license$.next(licensingMock.createLicense({ license: { type: 'platinum' } }));
      await jest.advanceTimersByTimeAsync(1000);

      expect(registeredDeepLinks).toHaveLength(0);
      expect(manageOldSiemRoutes).toHaveBeenCalledTimes(1);
    });
  });
});
