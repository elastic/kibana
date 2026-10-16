/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Capabilities, CoreStart } from '@kbn/core/public';
import { coreMock } from '@kbn/core/public/mocks';
import type { NavigationEntry } from '@kbn/observability-shared-plugin/public';
import { getClassicNavTopSections } from './get_classic_nav_top_sections';

const OVERVIEW: NavigationEntry = { label: 'Overview', app: 'observability-overview', path: '/' };
const FLAT_ALERTS: NavigationEntry = {
  label: 'Alerts',
  app: 'observability-overview',
  path: '/alerts',
};
const SLOS: NavigationEntry = { label: 'SLOs', app: 'slo', path: '' };
const CASES: NavigationEntry = { label: 'Cases', app: 'observability-overview', path: '/cases' };

const ENTRIES = {
  overviewLinks: [OVERVIEW],
  alertsLinks: [FLAT_ALERTS],
  trailingLinks: [SLOS, CASES],
};

const setCapabilities = (core: CoreStart, capabilities: Record<string, unknown>) => {
  core.application.capabilities = {
    ...core.application.capabilities,
    ...capabilities,
  } as Capabilities;
};

const setV2Enabled = (core: CoreStart, v2Enabled: boolean) => {
  core.settings.globalClient.isDeclared = () => true;
  core.settings.globalClient.get = <T>(_key: string) => v2Enabled as T;
  core.settings.client.get = <T>(_key: string) => false as T;
};

const getLayout = (core: CoreStart, entries = ENTRIES) =>
  getClassicNavTopSections(core, entries).map(({ label, sortKey, entries: sectionEntries }) => ({
    label,
    sortKey,
    labels: sectionEntries.map((entry) => entry.label),
  }));

describe('getClassicNavTopSections', () => {
  let core: CoreStart;

  beforeEach(() => {
    core = coreMock.createStart();
  });

  it('keeps the flat Alerts entry in a single top section while alerting v2 is disabled', () => {
    setV2Enabled(core, false);
    setCapabilities(core, { alerting_v2_alerts: { read: true } });

    expect(getLayout(core)).toEqual([
      { label: '', sortKey: 100, labels: ['Overview', 'Alerts', 'SLOs', 'Cases'] },
    ]);
  });

  it('places the Alerting section directly below Overview and drops the flat Alerts entry', () => {
    setV2Enabled(core, true);
    setCapabilities(core, { alerting_v2_alerts: { read: true } });

    expect(getLayout(core)).toEqual([
      { label: '', sortKey: 100, labels: ['Overview'] },
      { label: 'Alerting', sortKey: 101, labels: ['Alerts'] },
      { label: '', sortKey: 102, labels: ['SLOs', 'Cases'] },
    ]);
  });

  it('drops the flat Alerts entry without splitting the top section when the user has no alerting privileges', () => {
    setV2Enabled(core, true);

    expect(getLayout(core)).toEqual([
      { label: '', sortKey: 100, labels: ['Overview', 'SLOs', 'Cases'] },
    ]);
  });

  it('omits empty top sections around the Alerting section', () => {
    setV2Enabled(core, true);
    setCapabilities(core, { alerting_v2_alerts: { read: true } });

    expect(getLayout(core, { overviewLinks: [], alertsLinks: [], trailingLinks: [] })).toEqual([
      { label: 'Alerting', sortKey: 101, labels: ['Alerts'] },
    ]);
  });
});
