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
import type { DigitalExperienceSetupDeps } from './types';

const createCapabilities = (show: boolean) =>
  ({
    navLinks: {},
    management: {},
    catalogue: {},
    digital_experience: { show },
  } as CoreStart['application']['capabilities']);

const setup = ({ show, ux }: { show: boolean; ux?: { hideLegacyNavigation: jest.Mock } }) => {
  const coreSetup = coreMock.createSetup();
  const coreStart = coreMock.createStart();
  coreStart.application.capabilities = createCapabilities(show);
  coreSetup.getStartServices.mockResolvedValue([coreStart, {}, {}]);

  const registerSections = jest.fn();
  const plugin = new DigitalExperiencePlugin();
  plugin.setup(
    coreSetup as unknown as CoreSetup,
    {
      ux,
      observabilityShared: { navigation: { registerSections } },
    } as unknown as DigitalExperienceSetupDeps
  );

  const [app] = coreSetup.application.register.mock.calls[0] as [App];
  const sections$: Observable<Array<{ label: string; entries: unknown[] }>> =
    registerSections.mock.calls[0][0];
  return { plugin, app, coreStart, sections$ };
};

describe('hasDigitalExperienceAccess', () => {
  it('reflects the digital_experience show capability', () => {
    expect(hasDigitalExperienceAccess(createCapabilities(true))).toBe(true);
    expect(hasDigitalExperienceAccess(createCapabilities(false))).toBe(false);
  });
});

describe('DigitalExperiencePlugin', () => {
  it('registers the digital_experience app without touching the legacy ux navigation in setup', () => {
    const ux = { hideLegacyNavigation: jest.fn() };
    const { app } = setup({ show: true, ux });

    expect(app.id).toBe('digital_experience');
    expect(app.title).toBe('Digital Experience');
    expect(ux.hideLegacyNavigation).not.toHaveBeenCalled();
  });

  it.each([
    [true, 1],
    [false, 0],
  ])('hides the legacy ux navigation on start only when show is %s', (show, expectedCalls) => {
    const ux = { hideLegacyNavigation: jest.fn() };
    const { plugin, coreStart } = setup({ show, ux });

    plugin.start(coreStart);

    expect(ux.hideLegacyNavigation).toHaveBeenCalledTimes(expectedCalls);
  });

  it('works without the ux plugin', () => {
    const { plugin, coreStart } = setup({ show: true });

    expect(() => plugin.start(coreStart)).not.toThrow();
  });

  it.each([
    [true, AppStatus.accessible],
    [false, AppStatus.inaccessible],
  ])('sets the app status when show is %s', async (show, status) => {
    const { plugin, app, coreStart } = setup({ show });
    const updates = firstValueFrom(app.updater$!.pipe(take(2), toArray()));

    plugin.start(coreStart);

    const [, afterStart] = await updates;
    expect((afterStart as AppUpdater)(app)).toEqual({ status });
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
        label: 'Digital Experience',
        entries: [expect.objectContaining({ app: 'digital_experience', path: '/' })],
      });
    }
  });
});
