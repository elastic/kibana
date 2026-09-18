/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Capabilities, CoreStart } from '@kbn/core/public';
import { coreMock } from '@kbn/core/public/mocks';
import { getAlertsNavPanel } from './get_alerts_nav_panel';

const FULL_V2_CAPABILITIES = {
  alerting_v2_alerts: { read: true },
  alerting_v2_rules: { read: true },
  alerting_v2_action_policies: { read: true },
  alerting_v2_execution_history: { read: true },
  observabilityAlerts: { show: true },
  management: {
    insightsAndAlerting: {
      triggersActionsAlerts: true,
      triggersActionsRules: true,
      maintenanceWindows: true,
    },
  },
};

const enableV2 = (core: CoreStart) => {
  core.settings.globalClient.get = <T>(_key: string) => true as T;
  core.settings.client.get = <T>(_key: string) => false as T;
};

const setCapabilities = (core: CoreStart, capabilities: Record<string, unknown>) => {
  const management = capabilities.management as
    | { insightsAndAlerting?: Record<string, boolean> }
    | undefined;

  core.application.capabilities = {
    ...core.application.capabilities,
    ...capabilities,
    management: {
      ...core.application.capabilities.management,
      ...management,
      insightsAndAlerting: {
        ...core.application.capabilities.management?.insightsAndAlerting,
        ...management?.insightsAndAlerting,
      },
    },
  } as Capabilities;
};

const getPanelChildren = (core: CoreStart) => getAlertsNavPanel(core)[0]?.children ?? [];

const getSectionByTitle = (core: CoreStart, title?: string) =>
  getPanelChildren(core).find((section) => section.title === title);

describe('getAlertsNavPanel', () => {
  let core: CoreStart;

  beforeEach(() => {
    core = coreMock.createStart();
    core.settings.globalClient.get = <T>(_key: string) => false as T;
    core.settings.client.get = <T>(_key: string) => false as T;
  });

  it('returns the classic Alerts link when alerting v2 is disabled', () => {
    const result = getAlertsNavPanel(core);

    expect(result).toHaveLength(1);
    expect(result[0]).toEqual(
      expect.objectContaining({
        link: 'observability-overview:alerts',
        icon: 'warning',
      })
    );
    expect(result[0]).not.toHaveProperty('renderAs');
  });

  it('returns a full Alerting panel when the user has v1 and v2 read capabilities', () => {
    enableV2(core);
    setCapabilities(core, FULL_V2_CAPABILITIES);

    const result = getAlertsNavPanel(core);

    expect(result).toHaveLength(1);
    expect(result[0]).toEqual(
      expect.objectContaining({
        id: 'alerting',
        title: 'Alerting',
        icon: 'warning',
        renderAs: 'panelOpener',
      })
    );
    expect(result[0]).not.toHaveProperty('link');
    expect(result[0].children).toEqual([
      expect.objectContaining({
        breadcrumbStatus: 'hidden',
        children: [
          expect.objectContaining({
            link: 'observabilityAlerting:alerts',
            title: 'Alerts',
            badgeType: 'new',
          }),
        ],
      }),
      expect.objectContaining({
        title: 'Rule Management',
        children: [
          { link: 'observabilityAlerting:rules-v2' },
          { link: 'observabilityAlerting:rules-v1', sideNavStatus: 'hidden' },
        ],
      }),
      expect.objectContaining({
        title: 'Notifications and Suppressions',
        children: [
          expect.objectContaining({
            link: 'observabilityAlerting:action-policies',
            badgeType: 'new',
          }),
          { link: 'management:maintenanceWindows' },
        ],
      }),
      expect.objectContaining({
        title: 'Operations',
        children: [
          expect.objectContaining({
            link: 'observabilityAlerting:execution-history',
            badgeType: 'new',
          }),
        ],
      }),
    ]);
  });

  it('returns an empty array when alerting v2 is enabled but the user has no capabilities', () => {
    enableV2(core);

    expect(getAlertsNavPanel(core)).toEqual([]);
  });

  describe('alerts section', () => {
    beforeEach(() => {
      enableV2(core);
    });

    it('shows Alerts when the user has v2 alerts read', () => {
      setCapabilities(core, { alerting_v2_alerts: { read: true } });

      const result = getAlertsNavPanel(core);
      expect(result[0]).toEqual(
        expect.objectContaining({
          id: 'alerting',
          renderAs: 'panelOpener',
        })
      );
      expect(result[0]).not.toHaveProperty('link');
      expect(getSectionByTitle(core)?.children).toEqual([
        expect.objectContaining({ link: 'observabilityAlerting:alerts' }),
      ]);
    });

    it('shows Alerts when the user has v2 alerts all', () => {
      setCapabilities(core, { alerting_v2_alerts: { all: true } });

      expect(getSectionByTitle(core)?.children).toEqual([
        expect.objectContaining({ link: 'observabilityAlerting:alerts' }),
      ]);
    });

    it('shows Alerts when the user has v1 alerts read', () => {
      setCapabilities(core, { observabilityAlerts: { show: true } });

      expect(getSectionByTitle(core)?.children).toEqual([
        expect.objectContaining({ link: 'observabilityAlerting:alerts' }),
      ]);
    });

    it('shows Alerts and Alerts V1 when the user has v1 alerts read and the classic table setting is on', () => {
      core.settings.client.get = <T>(_key: string) => true as T;
      setCapabilities(core, { observabilityAlerts: { show: true } });

      expect(getSectionByTitle(core)?.children).toEqual([
        expect.objectContaining({ link: 'observabilityAlerting:alerts' }),
        expect.objectContaining({
          link: 'observability-overview:alerts',
          title: 'Alerts V1',
        }),
      ]);
    });

    it('shows Alerts and Alerts V1 when the user has the v1 alerts management capability', () => {
      core.settings.client.get = <T>(_key: string) => true as T;
      setCapabilities(core, {
        management: { insightsAndAlerting: { triggersActionsAlerts: true } },
      });

      expect(getSectionByTitle(core)?.children).toEqual([
        expect.objectContaining({ link: 'observabilityAlerting:alerts' }),
        expect.objectContaining({ link: 'observability-overview:alerts' }),
      ]);
    });

    it('does not show Alerts V1 when the classic table setting is off', () => {
      setCapabilities(core, { observabilityAlerts: { show: true } });

      expect(getSectionByTitle(core)?.children).toEqual([
        expect.objectContaining({ link: 'observabilityAlerting:alerts' }),
      ]);
    });

    it('shows Alerts and Alerts V1 when the user has both v1 and v2 alerts read', () => {
      core.settings.client.get = <T>(_key: string) => true as T;
      setCapabilities(core, {
        alerting_v2_alerts: { read: true },
        observabilityAlerts: { show: true },
      });

      expect(getSectionByTitle(core)?.children).toEqual([
        expect.objectContaining({ link: 'observabilityAlerting:alerts' }),
        expect.objectContaining({ link: 'observability-overview:alerts' }),
      ]);
    });
  });

  describe('rule management section', () => {
    beforeEach(() => {
      enableV2(core);
    });

    it('shows the v2 Rules link without the library when the user has v2 rules read', () => {
      setCapabilities(core, { alerting_v2_rules: { read: true } });

      expect(getSectionByTitle(core, 'Rule Management')?.children).toEqual([
        { link: 'observabilityAlerting:rules-v2' },
        { link: 'observabilityAlerting:rules-v1', sideNavStatus: 'hidden' },
      ]);
    });

    it('does not show the Rule library when the user has v2 rules write', () => {
      setCapabilities(core, { alerting_v2_rules: { all: true } });

      expect(getSectionByTitle(core, 'Rule Management')?.children).toEqual([
        { link: 'observabilityAlerting:rules-v2' },
        { link: 'observabilityAlerting:rules-v1', sideNavStatus: 'hidden' },
      ]);
    });

    it('shows a visible v1 Rules link when the user only has v1 rules read', () => {
      setCapabilities(core, {
        management: { insightsAndAlerting: { triggersActionsRules: true } },
      });

      expect(getSectionByTitle(core, 'Rule Management')?.children).toEqual([
        { link: 'observabilityAlerting:rules-v1' },
      ]);
    });

    it('prefers the v2 Rules link when the user has both v1 and v2 rules read', () => {
      setCapabilities(core, {
        alerting_v2_rules: { read: true },
        management: { insightsAndAlerting: { triggersActionsRules: true } },
      });

      expect(getSectionByTitle(core, 'Rule Management')?.children).toEqual([
        { link: 'observabilityAlerting:rules-v2' },
        { link: 'observabilityAlerting:rules-v1', sideNavStatus: 'hidden' },
      ]);
    });
  });

  describe('other sections', () => {
    beforeEach(() => {
      enableV2(core);
    });

    it('shows action policies when the user has v2 action policies read', () => {
      setCapabilities(core, { alerting_v2_action_policies: { read: true } });

      expect(getSectionByTitle(core, 'Notifications and Suppressions')?.children).toEqual([
        expect.objectContaining({ link: 'observabilityAlerting:action-policies' }),
      ]);
    });

    it('shows maintenance windows when the user has that management capability', () => {
      setCapabilities(core, {
        management: { insightsAndAlerting: { maintenanceWindows: true } },
      });

      expect(getSectionByTitle(core, 'Notifications and Suppressions')?.children).toEqual([
        { link: 'management:maintenanceWindows' },
      ]);
    });

    it('shows execution history when the user has v2 execution history read', () => {
      setCapabilities(core, { alerting_v2_execution_history: { read: true } });

      expect(getSectionByTitle(core, 'Operations')?.children).toEqual([
        expect.objectContaining({ link: 'observabilityAlerting:execution-history' }),
      ]);
    });
  });
});
