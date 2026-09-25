/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { coreMock } from '@kbn/core/public/mocks';
import React from 'react';
import {
  OBSERVABILITY_ALERTING_APP_ID,
  OBSERVABILITY_ALERTING_BASE_PATH,
} from '@kbn/deeplinks-observability';
import { ObservabilityAlertingPlugin } from './plugin';
import {
  OBSERVABILITY_ALERTING_INBOX_DEEP_LINK_ID,
  OBSERVABILITY_ALERTING_INBOX_PATH,
} from './constants';

describe('ObservabilityAlertingPlugin', () => {
  const setup = () => {
    const coreSetup = coreMock.createSetup();
    const coreStart = coreMock.createStart();

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

    const registeredApp = coreSetup.application.register.mock.calls[0][0];
    expect(registeredApp.status).toBeUndefined();
    expect(registeredApp.updater$).toBeUndefined();
  });

  it('mounts the app', async () => {
    const { registered } = setup();
    const unmount = await registered.mount!(coreMock.createAppMountParameters());

    expect(unmount).toEqual(expect.any(Function));
    unmount();
  });
});
