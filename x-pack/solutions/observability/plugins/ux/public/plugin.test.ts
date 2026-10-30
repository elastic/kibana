/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Observable } from 'rxjs';
import { firstValueFrom } from 'rxjs';
import type { App, CoreSetup, PluginInitializerContext } from '@kbn/core/public';
import { coreMock } from '@kbn/core/public/mocks';
import { UxPlugin } from './plugin';
import type { ApmPluginSetupDeps, ApmPluginStartDeps } from './plugin';

const setup = () => {
  const coreSetup = coreMock.createSetup();
  const coreStart = coreMock.createStart();
  coreStart.application.capabilities = {
    navLinks: {},
    management: {},
    catalogue: {},
    apm: { show: true },
  };
  coreSetup.getStartServices.mockResolvedValue([coreStart, {}, {}]);

  const registerSections = jest.fn();
  const plugin = new UxPlugin({ env: { mode: { dev: false } } } as PluginInitializerContext);
  plugin.setup(
    coreSetup as unknown as CoreSetup,
    {
      observabilityShared: { navigation: { registerSections } },
    } as unknown as ApmPluginSetupDeps
  );
  const contract = plugin.start(coreStart, {} as ApmPluginStartDeps);

  const [app] = coreSetup.application.register.mock.calls[0] as [App];
  const sections$: Observable<Array<{ label: string }>> = registerSections.mock.calls[0][0];
  return { contract, app, sections$ };
};

const currentAppUpdate = async (app: App) => {
  const updater = await firstValueFrom(app.updater$!);
  return updater(app);
};

describe('UxPlugin legacy navigation', () => {
  it('registers the "User Experience" nav section and a default app by default', async () => {
    const { app, sections$ } = setup();

    const sections = await firstValueFrom(sections$);
    expect(sections).toHaveLength(1);
    expect(sections[0]).toMatchObject({ label: 'User Experience' });
    expect(app.id).toBe('ux');
    expect(app.visibleIn).toBeUndefined();
    expect(await currentAppUpdate(app)).toEqual({});
  });

  it('drops the nav section and hides the app once hideLegacyNavigation is called', async () => {
    const { contract, app, sections$ } = setup();

    contract.hideLegacyNavigation();

    expect(await firstValueFrom(sections$)).toEqual([]);
    expect(await currentAppUpdate(app)).toEqual({ visibleIn: [] });
  });

  it('drops the nav section when hideLegacyNavigation is called after it was shown', async () => {
    const { contract, sections$ } = setup();
    const emitted: Array<Array<{ label: string }>> = [];
    const subscription = sections$.subscribe((sections) => emitted.push(sections));
    await new Promise(process.nextTick);

    contract.hideLegacyNavigation();

    expect(emitted.map((sections) => sections.length)).toEqual([1, 0]);
    subscription.unsubscribe();
  });
});
