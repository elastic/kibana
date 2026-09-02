/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Location } from 'history';
import type { RootNodeDefinition } from '@kbn/core-chrome-browser';
import { coreMock } from '@kbn/core/public/mocks';
import { getAlertsNavPanel } from './get_alerts_nav_panel';

const location = { pathname: '', search: '', hash: '', state: undefined } as Location;
const prepend = (path: string) => path;
const prependWithBasePath = (path: string) => `/s/oblt${path}`;

const isActive = (
  getIsActive: RootNodeDefinition['getIsActive'],
  pathNameSerialized: string,
  pathPrepend: (path: string) => string = prepend
): boolean => {
  if (!getIsActive) {
    throw new Error('expected getIsActive');
  }

  return getIsActive({ pathNameSerialized, location, prepend: pathPrepend });
};

describe('getAlertsNavPanel', () => {
  it('preserves serverless startsWith active matching on the plain Alerts link', () => {
    const core = coreMock.createStart();
    core.settings.globalClient.get = <T>(_key: string) => false as T;

    const [alertsLink] = getAlertsNavPanel(core);

    expect(alertsLink.getIsActive).toEqual(expect.any(Function));
    expect(isActive(alertsLink.getIsActive, '/app/observability/alerts')).toBe(true);
    expect(isActive(alertsLink.getIsActive, '/app/observability/alerts/abc-123')).toBe(true);
    expect(
      isActive(
        alertsLink.getIsActive,
        '/s/oblt/app/observability/alerts/abc-123',
        prependWithBasePath
      )
    ).toBe(true);
    expect(isActive(alertsLink.getIsActive, '/app/discover')).toBe(false);
    expect(isActive(alertsLink.getIsActive, '/app/observability/overview')).toBe(false);
  });

  it('uses the same active matcher on the v2 panel opener', () => {
    const core = coreMock.createStart();
    core.settings.globalClient.get = <T>(_key: string) => true as T;

    const [alertsPanel] = getAlertsNavPanel(core);

    expect(alertsPanel.getIsActive).toEqual(expect.any(Function));
    expect(isActive(alertsPanel.getIsActive, '/app/observability/alerts')).toBe(true);
    expect(isActive(alertsPanel.getIsActive, '/app/observability/alerts/abc-123')).toBe(true);
    expect(isActive(alertsPanel.getIsActive, '/app/discover')).toBe(false);
  });
});
