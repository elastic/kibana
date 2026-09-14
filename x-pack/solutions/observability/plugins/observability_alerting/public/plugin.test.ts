/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { App, AppUpdater, AppUpdatableFields } from '@kbn/core/public';
import { AppStatus } from '@kbn/core/public';
import { coreMock } from '@kbn/core/public/mocks';
import React from 'react';
import { ALERTING_V2_ENABLED_SETTING_ID } from '@kbn/alerting-v2-constants';
import { OBSERVABILITY_ALERTING_APP_ID } from '@kbn/deeplinks-observability';
import { BehaviorSubject, firstValueFrom } from 'rxjs';
import { ObservabilityAlertingPlugin } from './plugin';
import {
  OBSERVABILITY_ALERTING_BASE_PATH,
  OBSERVABILITY_ALERTING_INBOX_DEEP_LINK_ID,
  OBSERVABILITY_ALERTING_INBOX_PATH,
} from './constants';

const APP_STUB: App = {
  id: OBSERVABILITY_ALERTING_APP_ID,
  title: 'Alerting',
  mount: jest.fn(),
};

const readLatestUpdate = async (
  updater$: App['updater$'],
  enabled$: BehaviorSubject<boolean>
): Promise<Partial<AppUpdatableFields> | undefined> => {
  const updates: Array<Partial<AppUpdatableFields>> = [];
  const subscription = updater$!.subscribe((updater: AppUpdater) => {
    const fields = updater(APP_STUB);
    if (fields) {
      updates.push(fields);
    }
  });

  enabled$.next(enabled$.getValue());
  await firstValueFrom(updater$!);
  subscription.unsubscribe();
  return updates[updates.length - 1];
};

describe('ObservabilityAlertingPlugin', () => {
  const setupWithSetting = (enabled: boolean) => {
    const coreSetup = coreMock.createSetup();
    const coreStart = coreMock.createStart();
    const enabled$ = new BehaviorSubject(enabled);

    coreSetup.getStartServices.mockResolvedValue([
      coreStart,
      {
        alertingVTwo: {
          RulesPage: () => null,
          RuleLibraryPage: () => null,
          EpisodesPage: () => null,
          ActionPoliciesPage: () => null,
          ExecutionHistoryPage: () => null,
          CreateRuleOptionsFlyout: () => null,
          createAlertingV2HostApp: jest.fn((appId: string, paths: Record<string, string>) =>
            Object.fromEntries(
              Object.entries(paths).map(([k, v]) => [k, { app: appId, basePath: v }])
            )
          ),
        },
        triggersActionsUi: {
          getClassicRulesPage: () => React.createElement('div'),
        },
      },
      {},
    ]);
    coreStart.settings.globalClient.get$.mockImplementation((key: string, fallback = false) => {
      if (key === ALERTING_V2_ENABLED_SETTING_ID) {
        return enabled$;
      }
      return new BehaviorSubject(Boolean(fallback));
    });

    const plugin = new ObservabilityAlertingPlugin();
    plugin.setup(coreSetup);

    const registered = coreSetup.application.register.mock.calls[0][0];
    return { coreSetup, coreStart, enabled$, plugin, registered };
  };

  it('registers the app with correct id, appRoute, and visibleIn', () => {
    const { coreSetup } = setupWithSetting(false);

    expect(coreSetup.application.register).toHaveBeenCalledWith(
      expect.objectContaining({
        id: OBSERVABILITY_ALERTING_APP_ID,
        appRoute: OBSERVABILITY_ALERTING_BASE_PATH,
        status: AppStatus.inaccessible,
        visibleIn: [],
        deepLinks: expect.arrayContaining([
          expect.objectContaining({
            id: OBSERVABILITY_ALERTING_INBOX_DEEP_LINK_ID,
            path: OBSERVABILITY_ALERTING_INBOX_PATH,
            visibleIn: [],
          }),
          expect.objectContaining({
            id: 'rules-v1',
            path: '/rules/v1',
            visibleIn: [],
          }),
          expect.objectContaining({
            id: 'rules-v2',
            path: '/rules/v2',
            visibleIn: [],
          }),
          expect.objectContaining({
            id: 'rule-library',
            path: '/rule-library',
            visibleIn: [],
          }),
          expect.objectContaining({
            id: 'action-policies',
            path: '/action-policies',
            visibleIn: [],
          }),
          expect.objectContaining({
            id: 'execution-history',
            path: '/execution-history',
            visibleIn: [],
          }),
        ]),
      })
    );
  });

  it('makes the app accessible when alerting v2 is enabled', async () => {
    const { registered, enabled$ } = setupWithSetting(true);
    const update = await readLatestUpdate(registered.updater$, enabled$);

    expect(update).toEqual({
      status: AppStatus.accessible,
    });
  });

  it('keeps the app inaccessible when alerting v2 is disabled', async () => {
    const { registered, enabled$ } = setupWithSetting(false);
    const update = await readLatestUpdate(registered.updater$, enabled$);

    expect(update).toEqual({
      status: AppStatus.inaccessible,
    });
  });

  it('mounts the app when accessible', async () => {
    const { registered } = setupWithSetting(true);
    const unmount = await registered.mount!(coreMock.createAppMountParameters());

    expect(unmount).toEqual(expect.any(Function));
    unmount();
  });
});
