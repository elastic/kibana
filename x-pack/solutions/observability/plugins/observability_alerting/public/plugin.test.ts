/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { App, AppUpdater } from '@kbn/core/public';
import { coreMock } from '@kbn/core/public/mocks';
import { isAlertingV2Enabled } from '@kbn/alerting-v2-utils';
import type { Observable } from 'rxjs';
import { ObservabilityAlertingPlugin } from './plugin';
import {
  OBSERVABILITY_ALERTING_APP_ID,
  OBSERVABILITY_ALERTING_BASE_PATH,
  OBSERVABILITY_ALERTING_INBOX_DEEP_LINK_ID,
  OBSERVABILITY_ALERTING_INBOX_PATH,
} from './constants';

jest.mock('@kbn/alerting-v2-utils', () => ({
  isAlertingV2Enabled: jest.fn(),
}));

const isAlertingV2EnabledMock = isAlertingV2Enabled as jest.MockedFunction<
  typeof isAlertingV2Enabled
>;

const APP_STUB = {
  id: OBSERVABILITY_ALERTING_APP_ID,
  title: 'Alerting',
  mount: jest.fn(),
} as unknown as App;

const readVisibleIn = (updater$: Observable<AppUpdater> | undefined): string[] | undefined => {
  let visibleIn: string[] | undefined;
  updater$?.subscribe((next) => {
    visibleIn = next(APP_STUB)?.visibleIn as string[] | undefined;
  });
  return visibleIn;
};

describe('ObservabilityAlertingPlugin', () => {
  it('registers the observability alerting app with global-search deep links', () => {
    const coreSetup = coreMock.createSetup();
    const plugin = new ObservabilityAlertingPlugin();

    plugin.setup(coreSetup);

    expect(coreSetup.application.register).toHaveBeenCalledWith(
      expect.objectContaining({
        id: OBSERVABILITY_ALERTING_APP_ID,
        appRoute: OBSERVABILITY_ALERTING_BASE_PATH,
        visibleIn: [],
        deepLinks: expect.arrayContaining([
          expect.objectContaining({
            id: OBSERVABILITY_ALERTING_INBOX_DEEP_LINK_ID,
            path: OBSERVABILITY_ALERTING_INBOX_PATH,
            visibleIn: ['globalSearch'],
          }),
          expect.objectContaining({
            id: 'rules-v2',
            path: '/rules/v2',
            visibleIn: ['globalSearch'],
          }),
          expect.objectContaining({
            id: 'rule-library',
            path: '/rule-library',
            visibleIn: ['globalSearch'],
          }),
          expect.objectContaining({
            id: 'action-policies',
            path: '/action-policies',
            visibleIn: ['globalSearch'],
          }),
          expect.objectContaining({
            id: 'execution-history',
            path: '/execution-history',
            visibleIn: ['globalSearch'],
          }),
        ]),
      })
    );
  });

  it('exposes the app in global search when alerting v2 is enabled', () => {
    isAlertingV2EnabledMock.mockReturnValue(true);
    const coreSetup = coreMock.createSetup();
    const coreStart = coreMock.createStart();
    const plugin = new ObservabilityAlertingPlugin();

    plugin.setup(coreSetup);
    plugin.start(coreStart);

    const registered = coreSetup.application.register.mock.calls[0][0];
    expect(readVisibleIn(registered.updater$)).toEqual(['globalSearch']);
  });

  it('keeps the app hidden from global search when alerting v2 is disabled', () => {
    isAlertingV2EnabledMock.mockReturnValue(false);
    const coreSetup = coreMock.createSetup();
    const coreStart = coreMock.createStart();
    const plugin = new ObservabilityAlertingPlugin();

    plugin.setup(coreSetup);
    plugin.start(coreStart);

    const registered = coreSetup.application.register.mock.calls[0][0];
    expect(readVisibleIn(registered.updater$)).toEqual([]);
  });

  it('redirects to classic observability alerts when alerting v2 is disabled', async () => {
    isAlertingV2EnabledMock.mockReturnValue(false);
    const coreSetup = coreMock.createSetup();
    const coreStart = coreMock.createStart();
    coreSetup.getStartServices.mockResolvedValue([coreStart, { alertingVTwo: {} }, {}]);
    const plugin = new ObservabilityAlertingPlugin();

    plugin.setup(coreSetup);

    const registered = coreSetup.application.register.mock.calls[0][0];
    const unmount = await registered.mount!(coreMock.createAppMountParameters());

    expect(coreStart.application.navigateToApp).toHaveBeenCalledWith('observability-overview', {
      path: '/alerts',
      replace: true,
    });

    unmount();
  });
});
