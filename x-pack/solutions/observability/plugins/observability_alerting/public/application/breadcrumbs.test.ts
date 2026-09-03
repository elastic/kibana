/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ChromeBreadcrumb } from '@kbn/core/public';
import { coreMock } from '@kbn/core/public/mocks';
import { scopedHistoryMock } from '@kbn/core-application-browser-mocks';
import { createObservabilityAlertingSetBreadcrumbs } from './breadcrumbs';

describe('createObservabilityAlertingSetBreadcrumbs', () => {
  it('prepends Observability and Alerting and skips the inner Alerting V2 root crumb', () => {
    const coreStart = coreMock.createStart();
    coreStart.application.getUrlForApp.mockReturnValue('/app/observability');
    const history = scopedHistoryMock.create({ pathname: '/inbox' });
    history.createHref.mockImplementation(
      ({ pathname }) => `/app/observability/alerting${pathname}`
    );

    const setBreadcrumbs = createObservabilityAlertingSetBreadcrumbs({
      application: coreStart.application,
      chrome: coreStart.chrome,
      history,
    });

    const appHistory = scopedHistoryMock.create({ pathname: '/' });
    appHistory.createHref.mockImplementation(
      ({ pathname }) => `/app/observability/alerting/inbox${pathname === '/' ? '' : pathname}`
    );

    setBreadcrumbs(
      [{ text: 'Alerting V2' }, { text: 'Alert episodes', href: '/' }, { text: 'Episode A' }],
      appHistory
    );

    const crumbs = coreStart.chrome.setBreadcrumbs.mock.calls[0][0] as ChromeBreadcrumb[];
    expect(crumbs.map((crumb) => crumb.text)).toEqual([
      'Observability',
      'Alerting',
      'Alert episodes',
      'Episode A',
    ]);
    expect(crumbs[0].href).toBe('/app/observability');
  });
});
