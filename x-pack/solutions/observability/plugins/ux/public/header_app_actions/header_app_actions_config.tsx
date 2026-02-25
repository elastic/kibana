/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { ChromeHeaderAppActionsConfig } from '@kbn/core-chrome-browser';

const noop = () => {};

const ALERTS_PANEL_ID = 1;
const SLOS_PANEL_ID = 2;

/**
 * POC: Header app actions config for the User Experience app (same content as APM overflow).
 * Single secondary overflow action (•••) with Alerts, SLOs, Settings, Feedback.
 * All actions are dumb (noop) for visual parity only.
 */
export function getUxHeaderAppActionsConfig(): ChromeHeaderAppActionsConfig {
  return {
    overflowPanels: [
      {
        id: 0,
        title: '',
        items: [
          {
            name: i18n.translate('xpack.apm.storageExplorerLinkLabel', {
              defaultMessage: 'Storage explorer',
            }),
            icon: 'storage',
            onClick: noop,
          },
          {
            name: i18n.translate('xpack.apm.home.sloMenu.slosHeaderLink', {
              defaultMessage: 'SLOs',
            }),
            icon: 'visGauge',
            onClick: noop,
            panel: SLOS_PANEL_ID,
          },
          {
            name: i18n.translate('xpack.apm.home.alertsMenu.alerts', {
              defaultMessage: 'Alerts',
            }),
            icon: 'bell',
            onClick: noop,
            panel: ALERTS_PANEL_ID,
          },
          { isSeparator: true as const, key: 'sepAlertsSettings' },
          {
            name: i18n.translate('xpack.apm.settingsLinkLabel', {
              defaultMessage: 'Settings',
            }),
            icon: 'gear',
            onClick: noop,
          },
          { isSeparator: true as const, key: 'sepSettingsFeedback' },
          {
            name: i18n.translate('xpack.apm.serviceInventoryHeaderAppActions.giveFeedback', {
              defaultMessage: 'Give feedback',
            }),
            icon: 'popout',
            onClick: noop,
          },
        ],
      },
      {
        id: ALERTS_PANEL_ID,
        title: i18n.translate('xpack.apm.home.alertsMenu.alerts', {
          defaultMessage: 'Alerts',
        }),
        items: [
          {
            name: i18n.translate('xpack.apm.home.alertsMenu.createThresholdAlert', {
              defaultMessage: 'Create threshold rule',
            }),
            icon: 'bell',
            onClick: noop,
          },
          {
            name: i18n.translate('xpack.apm.home.alertsMenu.createAnomalyAlert', {
              defaultMessage: 'Create anomaly rule',
            }),
            icon: 'bell',
            onClick: noop,
          },
          {
            name: i18n.translate('xpack.apm.home.alertsMenu.errorCount', {
              defaultMessage: 'Create error count rule',
            }),
            icon: 'bell',
            onClick: noop,
          },
          {
            name: i18n.translate('xpack.apm.home.alertsMenu.viewActiveAlerts', {
              defaultMessage: 'Manage rules',
            }),
            icon: 'tableOfContents',
            onClick: noop,
          },
        ],
      },
      {
        id: SLOS_PANEL_ID,
        title: i18n.translate('xpack.apm.home.sloMenu.slosHeaderLink', {
          defaultMessage: 'SLOs',
        }),
        items: [
          {
            name: i18n.translate('xpack.apm.home.sloMenu.createLatencySlo', {
              defaultMessage: 'Create APM latency SLO',
            }),
            icon: 'visGauge',
            onClick: noop,
          },
          {
            name: i18n.translate('xpack.apm.home.sloMenu.createAvailabilitySlo', {
              defaultMessage: 'Create APM availability SLO',
            }),
            icon: 'visGauge',
            onClick: noop,
          },
          {
            name: i18n.translate('xpack.apm.home.sloMenu.manageSlos', {
              defaultMessage: 'Manage SLOs',
            }),
            icon: 'tableOfContents',
            onClick: noop,
          },
        ],
      },
    ],
  };
}
