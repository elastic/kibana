/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Capabilities, CoreStart } from '@kbn/core/public';
import { coreMock } from '@kbn/core/public/mocks';
import { getAlertingClassicNavSection } from './get_alerting_classic_nav_section';

const V2_CAPABILITIES = {
  alerting_v2_alerts: { read: true },
  alerting_v2_rules: { read: true },
  alerting_v2_action_policies: { read: true },
  alerting_v2_execution_history: { read: true },
};

const setCapabilities = (core: CoreStart, capabilities: Record<string, unknown>) => {
  core.application.capabilities = {
    ...core.application.capabilities,
    ...capabilities,
  } as Capabilities;
};

const setSettings = (
  core: CoreStart,
  { v2Enabled, showV1Table }: { v2Enabled: boolean; showV1Table: boolean }
) => {
  core.settings.globalClient.isDeclared = () => true;
  core.settings.globalClient.get = <T>(_key: string) => v2Enabled as T;
  core.settings.client.get = <T>(_key: string) => showV1Table as T;
};

const getEntries = (core: CoreStart) =>
  getAlertingClassicNavSection(core).flatMap(({ entries }) =>
    entries.map(({ label, app, path }) => ({ label, app, path }))
  );

describe('getAlertingClassicNavSection', () => {
  let core: CoreStart;

  beforeEach(() => {
    core = coreMock.createStart();
    setSettings(core, { v2Enabled: true, showV1Table: false });
  });

  it('returns no section while alerting v2 is disabled', () => {
    setSettings(core, { v2Enabled: false, showV1Table: true });
    setCapabilities(core, { ...V2_CAPABILITIES, observabilityAlerts: { show: true } });

    expect(getAlertingClassicNavSection(core)).toEqual([]);
  });

  it('returns no section when the user has no alerting privileges', () => {
    expect(getAlertingClassicNavSection(core)).toEqual([]);
  });

  it('returns the labeled section sorted directly after the Overview section', () => {
    setCapabilities(core, V2_CAPABILITIES);

    expect(getAlertingClassicNavSection(core)).toEqual([
      expect.objectContaining({ label: 'Alerting', sortKey: 101 }),
    ]);
  });

  it('lists every v2 destination for a user with all v2 read privileges', () => {
    setCapabilities(core, V2_CAPABILITIES);

    expect(getEntries(core)).toEqual([
      { label: 'Alerts', app: 'observabilityAlerting', path: '/alerts' },
      { label: 'Rule Library', app: 'observabilityAlerting', path: '/rule-library' },
      { label: 'Action Policies', app: 'observabilityAlerting', path: '/action-policies' },
      { label: 'Execution History', app: 'observabilityAlerting', path: '/execution-history' },
    ]);
  });

  it('lists Rule Library when the user has v2 rules read', () => {
    setCapabilities(core, { alerting_v2_rules: { read: true } });

    expect(getEntries(core)).toEqual([
      { label: 'Rule Library', app: 'observabilityAlerting', path: '/rule-library' },
    ]);
  });

  it('lists Rule Library when the user has v2 rules write', () => {
    setCapabilities(core, { alerting_v2_rules: { all: true } });

    expect(getEntries(core)).toEqual([
      { label: 'Rule Library', app: 'observabilityAlerting', path: '/rule-library' },
    ]);
  });

  it('lists only the destinations the user has v2 privileges for', () => {
    setCapabilities(core, { alerting_v2_action_policies: { read: true } });

    expect(getEntries(core)).toEqual([
      { label: 'Action Policies', app: 'observabilityAlerting', path: '/action-policies' },
    ]);
  });

  it('shows only Alerts to a v1-only user while the V1 table is hidden', () => {
    setCapabilities(core, { observabilityAlerts: { show: true } });

    expect(getEntries(core)).toEqual([
      { label: 'Alerts', app: 'observabilityAlerting', path: '/alerts' },
    ]);
  });

  it('adds Alerts (Classic) after Alerts when the V1 table setting is on', () => {
    setSettings(core, { v2Enabled: true, showV1Table: true });
    setCapabilities(core, { ...V2_CAPABILITIES, observabilityAlerts: { show: true } });

    expect(getEntries(core).slice(0, 2)).toEqual([
      { label: 'Alerts', app: 'observabilityAlerting', path: '/alerts' },
      { label: 'Alerts (Classic)', app: 'observability-overview', path: '/alerts' },
    ]);
  });

  it('hides Alerts (Classic) from users without v1 alerts privileges even when the setting is on', () => {
    setSettings(core, { v2Enabled: true, showV1Table: true });
    setCapabilities(core, V2_CAPABILITIES);

    expect(getEntries(core).map(({ label }) => label)).not.toContain('Alerts (Classic)');
  });
});
