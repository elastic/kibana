/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { buildAlertDetailsPath, buildAlertDetailsUrl } from './build_alert_details_url';

describe('buildAlertDetailsUrl', () => {
  it('builds path with index and without timestamp when timestamp omitted', () => {
    expect(
      buildAlertDetailsPath({
        alertId: 'alert-1',
        index: '.alerts-security.alerts-default',
      })
    ).toBe('/app/security/alerts/redirect/alert-1?index=.alerts-security.alerts-default');
  });

  it('includes timestamp query param when provided', () => {
    expect(
      buildAlertDetailsPath({
        alertId: 'alert-1',
        index: '.alerts-security.alerts-default',
        timestamp: '2023-04-20T12:00:00.000Z',
      })
    ).toBe(
      '/app/security/alerts/redirect/alert-1?index=.alerts-security.alerts-default&timestamp=2023-04-20T12%3A00%3A00.000Z'
    );
  });

  it('defaults index from spaceId and applies prependPath', () => {
    const prependPath = jest.fn((path: string) => `/s/soc${path}`);
    expect(
      buildAlertDetailsUrl({
        prependPath,
        spaceId: 'soc',
        alertId: 'alert-9',
      })
    ).toBe('/s/soc/app/security/alerts/redirect/alert-9?index=.alerts-security.alerts-soc');
    expect(prependPath).toHaveBeenCalled();
  });
});
