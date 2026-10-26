/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Observable } from 'rxjs';
import { firstValueFrom, take, toArray } from 'rxjs';
import type { App, AppUpdater, CoreSetup, CoreStart } from '@kbn/core/public';
import { AppStatus } from '@kbn/core/public';
import { coreMock } from '@kbn/core/public/mocks';
import { hasDigitalExperienceAccess } from './capabilities';
import { DigitalExperiencePlugin } from './plugin';
import type { DigitalExperienceSetupDeps, DigitalExperienceStartDeps } from './types';

const createCapabilities = (show: boolean, apmShow = true) =>
  ({
    navLinks: {},
    management: {},
    catalogue: {},
    digital_experience: { show },
    apm: { show: apmShow },
  } as CoreStart['application']['capabilities']);

const createUx = () => ({ hideLegacyNavigation: jest.fn() });

const setup = ({
  show,
  ux = createUx(),
}: {
  show: boolean;
  ux?: { hideLegacyNavigation: jest.Mock } | null;
}) => {
  const coreSetup = coreMock.createSetup();
  const coreStart = coreMock.createStart();
  coreStart.application.capabilities = createCapabilities(show);
  const pluginsStart = { ux: ux ?? undefined } as unknown as DigitalExperienceStartDeps;
  coreSetup.getStartServices.mockResolvedValue([coreStart, pluginsStart, {}]);

  const registerSections = jest.fn();
  const plugin = new DigitalExperiencePlugin();
  plugin.setup(
    coreSetup as unknown as CoreSetup<DigitalExperienceStartDeps>,
    {
      observabilityShared: { navigation: { registerSections } },
    } as unknown as DigitalExperienceSetupDeps
  );

  const [app] = coreSetup.application.register.mock.calls[0] as [App];
  const sections$: Observable<Array<{ label: string; entries: unknown[] }>> =
    registerSections.mock.calls[0][0];
  const start = () => plugin.start(coreStart, pluginsStart);
  return { app, start, sections$ };
};

describe('hasDigitalExperienceAccess', () => {
  it('reflects the digital_experience show capability', () => {
    expect(hasDigitalExperienceAccess(createCapabilities(true))).toBe(true);
    expect(hasDigitalExperienceAccess(createCapabilities(false))).toBe(false);
  });

  it('requires APM access, which the app reads its data through', () => {
    expect(hasDigitalExperienceAccess(createCapabilities(true, false))).toBe(false);
  });
});

describe('DigitalExperiencePlugin', () => {
  it('registers the digital_experience app', () => {
    const { app } = setup({ show: true });

    expect(app.id).toBe('digital_experience');
    expect(app.title).toBe('Digital experience');
  });

  it.each([
    [true, 1],
    [false, 0],
  ])('hides the legacy ux navigation on start only when show is %s', (show, expectedCalls) => {
    const ux = createUx();
    const { start } = setup({ show, ux });

    start();

    expect(ux.hideLegacyNavigation).toHaveBeenCalledTimes(expectedCalls);
  });

  it.each([
    [true, AppStatus.accessible],
    [false, AppStatus.inaccessible],
  ])('sets the app status when show is %s', async (show, status) => {
    const { app, start } = setup({ show });
    const updates = firstValueFrom(app.updater$!.pipe(take(2), toArray()));

    start();

    const [, afterStart] = await updates;
    expect((afterStart as AppUpdater)(app)).toEqual({ status });
  });

  it('stays accessible with its nav section without the ux plugin, as on serverless', async () => {
    const { app, start, sections$ } = setup({ show: true, ux: null });
    const updates = firstValueFrom(app.updater$!.pipe(take(2), toArray()));

    start();

    const [, afterStart] = await updates;
    expect((afterStart as AppUpdater)(app)).toEqual({ status: AppStatus.accessible });
    expect(await firstValueFrom(sections$)).toHaveLength(1);
  });

  it.each([
    [true, 1],
    [false, 0],
  ])('registers the nav section only when show is %s', async (show, expectedSections) => {
    const { sections$ } = setup({ show });

    const sections = await firstValueFrom(sections$);

    expect(sections).toHaveLength(expectedSections);
    if (show) {
      expect(sections[0]).toMatchObject({
        label: 'Digital experience',
        entries: [expect.objectContaining({ app: 'digital_experience', path: '/' })],
      });
    }
  });

  it('keeps Applications selected on every page, including the app root', async () => {
    const { sections$ } = setup({ show: true });

    const [{ entries }] = (await firstValueFrom(sections$)) as Array<{
      entries: Array<{ matchPath: (path: string) => boolean }>;
    }>;

    expect(['', '/', '/my-app'].map(entries[0].matchPath)).toStrictEqual([true, true, true]);
  });
});
