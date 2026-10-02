/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { App, AppUpdatableFields, Capabilities } from '@kbn/core/public';
import { coreMock } from '@kbn/core/public/mocks';
import React from 'react';
import {
  OBSERVABILITY_ALERTING_APP_ID,
  OBSERVABILITY_ALERTING_BASE_PATH,
} from '@kbn/deeplinks-observability';
import { firstValueFrom } from 'rxjs';
import { ObservabilityAlertingPlugin } from './plugin';
import {
  OBSERVABILITY_ALERTING_ALERTS_DEEP_LINK_ID,
  OBSERVABILITY_ALERTING_ALERTS_PATH,
  OBSERVABILITY_ALERTING_RULES_V1_DEEP_LINK_ID,
  OBSERVABILITY_ALERTING_RULES_V2_DEEP_LINK_ID,
  OBSERVABILITY_ALERTING_RULE_LIBRARY_DEEP_LINK_ID,
  OBSERVABILITY_ALERTING_ACTION_POLICIES_DEEP_LINK_ID,
  OBSERVABILITY_ALERTING_EXECUTION_HISTORY_DEEP_LINK_ID,
} from './constants';
import { getObservabilityAlertingDeepLinks } from './get_observability_alerting_deep_links';

const APP_STUB: App = {
  id: OBSERVABILITY_ALERTING_APP_ID,
  title: 'Alerting',
  mount: jest.fn(),
};

const readLatestUpdate = async (
  updater$: App['updater$']
): Promise<Partial<AppUpdatableFields> | undefined> => {
  const updater = await firstValueFrom(updater$!);
  return updater(APP_STUB) ?? undefined;
};

describe('ObservabilityAlertingPlugin', () => {
  const setup = (capabilities: Record<string, Record<string, boolean>> = {}) => {
    const coreSetup = coreMock.createSetup();
    const coreStart = coreMock.createStart();

    coreStart.application.capabilities = {
      ...coreStart.application.capabilities,
      ...capabilities,
    } as Capabilities;

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
              Object.entries(paths).map(([k, v]) => [k, { app: appId, pathPrefix: v }])
            )
          ),
        },
        triggersActionsUi: {
          getClassicRulesPage: () => React.createElement('div'),
        },
      },
      {},
    ]);

    const plugin = new ObservabilityAlertingPlugin();
    plugin.setup(coreSetup);

    const registered = coreSetup.application.register.mock.calls[0][0];
    return { coreSetup, coreStart, plugin, registered };
  };

  it('registers the app with correct id, appRoute, and visibleIn, with no status override', () => {
    const { coreSetup } = setup();

    expect(coreSetup.application.register).toHaveBeenCalledWith(
      expect.objectContaining({
        id: OBSERVABILITY_ALERTING_APP_ID,
        appRoute: OBSERVABILITY_ALERTING_BASE_PATH,
        euiIconType: 'logoObservability',
        visibleIn: [],
        deepLinks: expect.arrayContaining([
          expect.objectContaining({
            id: OBSERVABILITY_ALERTING_ALERTS_DEEP_LINK_ID,
            path: OBSERVABILITY_ALERTING_ALERTS_PATH,
            visibleIn: ['globalSearch', 'projectSideNav'],
          }),
          expect.objectContaining({
            id: 'rules-v1',
            path: '/rules/v1',
            visibleIn: ['globalSearch', 'projectSideNav'],
          }),
          expect.objectContaining({
            id: 'rules-v2',
            path: '/rules/v2',
            visibleIn: ['globalSearch', 'projectSideNav'],
          }),
          expect.objectContaining({
            id: 'rule-library',
            path: '/rule-library',
            visibleIn: [],
          }),
          expect.objectContaining({
            id: 'action-policies',
            path: '/action-policies',
            visibleIn: ['globalSearch', 'projectSideNav'],
          }),
          expect.objectContaining({
            id: 'execution-history',
            path: '/execution-history',
            visibleIn: ['globalSearch', 'projectSideNav'],
          }),
        ]),
      })
    );

    const registeredApp = coreSetup.application.register.mock.calls[0][0];
    expect(registeredApp.status).toBeUndefined();
    expect(registeredApp.updater$).toBeDefined();
  });

  it('filters deep links by capability once start services resolve', async () => {
    const { registered, coreStart } = setup();
    const update = await readLatestUpdate(registered.updater$);

    expect(update).toEqual({
      deepLinks: getObservabilityAlertingDeepLinks(coreStart.application.capabilities),
    });
  });

  it('hides unauthorized deep links from global search', async () => {
    const { registered } = setup({
      alerting_v2_alerts: { read: true },
    });
    const update = await readLatestUpdate(registered.updater$);

    const visibilityById = Object.fromEntries(
      (update?.deepLinks ?? []).map((deepLink) => [deepLink.id, deepLink.visibleIn ?? []])
    );

    expect(visibilityById).toEqual({
      [OBSERVABILITY_ALERTING_ALERTS_DEEP_LINK_ID]: ['globalSearch', 'projectSideNav'],
      [OBSERVABILITY_ALERTING_RULES_V1_DEEP_LINK_ID]: [],
      [OBSERVABILITY_ALERTING_RULES_V2_DEEP_LINK_ID]: [],
      [OBSERVABILITY_ALERTING_RULE_LIBRARY_DEEP_LINK_ID]: [],
      [OBSERVABILITY_ALERTING_ACTION_POLICIES_DEEP_LINK_ID]: [],
      [OBSERVABILITY_ALERTING_EXECUTION_HISTORY_DEEP_LINK_ID]: [],
    });
  });

  it('mounts the app', async () => {
    const { registered } = setup();
    const unmount = await registered.mount!(coreMock.createAppMountParameters());

    expect(unmount).toEqual(expect.any(Function));
    unmount();
  });
});
