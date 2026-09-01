/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AlertingV2PublicStart } from '@kbn/alerting-v2-plugin/public';
import { coreMock } from '@kbn/core/public/mocks';
import { createMemoryHistory } from 'history';
import { mountObservabilityAlertingApp } from './mount';

describe('mountObservabilityAlertingApp', () => {
  it('renders into the mount element and unmounts', () => {
    const coreStart = coreMock.createStart();
    const params = coreMock.createAppMountParameters();
    const history = createMemoryHistory({ initialEntries: ['/inbox'] });
    (
      history as unknown as { createSubHistory: (basePath: string) => typeof history }
    ).createSubHistory = (basePath: string) =>
      createMemoryHistory({
        initialEntries: [history.location.pathname.slice(basePath.length) || '/'],
      });
    params.history = history as unknown as typeof params.history;

    const alertingVTwo: AlertingV2PublicStart = {
      CreateRuleOptionsFlyout: () => null,
      mountEpisodesApp: jest.fn(async () => () => undefined),
      mountRulesApp: jest.fn(async () => () => undefined),
      mountRuleLibraryApp: jest.fn(async () => () => undefined),
      mountActionPoliciesApp: jest.fn(async () => () => undefined),
      mountExecutionHistoryApp: jest.fn(async () => () => undefined),
    };

    const unmount = mountObservabilityAlertingApp({
      alertingVTwo,
      coreStart,
      params,
    });

    expect(params.element.className).toContain('kbnAppWrapper');
    expect(params.element.childElementCount).toBeGreaterThan(0);

    unmount();
    expect(params.element.childElementCount).toBe(0);
  });
});
