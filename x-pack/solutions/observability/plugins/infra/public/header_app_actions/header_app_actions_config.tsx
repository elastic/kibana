/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiButtonIcon } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { ChromeHeaderAppActionsConfig } from '@kbn/core-chrome-browser';

const noop = () => {};

const LOGS_ANOMALIES_ALERTS_PANEL_ID = 1;

/**
 * Header app actions config for the Logs Anomalies page (/logs/anomalies).
 * Single secondary action: Overflow (•••) with Add data, Alerts (submenu: Create rule, Manage rules), Docs, Feedback.
 * POC: all actions are dumb (noop). Set when anomalies page mounts; clear when navigating away.
 */
export function getLogsAnomaliesHeaderAppActionsConfig(): ChromeHeaderAppActionsConfig {
  return {
    overflowPanels: [
      {
        id: 0,
        title: '',
        items: [
          {
            name: i18n.translate('xpack.infra.logsAnomaliesHeaderAppActions.overflowAddData', {
              defaultMessage: 'Add data',
            }),
            icon: 'plusInCircle',
            onClick: noop,
          },
          {
            name: i18n.translate('xpack.infra.logsAnomaliesHeaderAppActions.overflowAlerts', {
              defaultMessage: 'Alerts',
            }),
            icon: 'bell',
            onClick: noop,
            panel: LOGS_ANOMALIES_ALERTS_PANEL_ID,
          },
          {
            name: i18n.translate('xpack.infra.logsAnomaliesHeaderAppActions.overflowDocs', {
              defaultMessage: 'Docs',
            }),
            icon: 'documentation',
            onClick: noop,
          },
          {
            name: i18n.translate('xpack.infra.logsAnomaliesHeaderAppActions.overflowFeedback', {
              defaultMessage: 'Feedback',
            }),
            icon: 'editorComment',
            onClick: noop,
          },
        ],
      },
      {
        id: LOGS_ANOMALIES_ALERTS_PANEL_ID,
        title: i18n.translate('xpack.infra.logsAnomaliesHeaderAppActions.alertsPanelTitle', {
          defaultMessage: 'Alerts',
        }),
        items: [
          {
            name: i18n.translate('xpack.infra.logsAnomaliesHeaderAppActions.createRule', {
              defaultMessage: 'Create rule',
            }),
            icon: 'bell',
            onClick: noop,
          },
          {
            name: i18n.translate('xpack.infra.logsAnomaliesHeaderAppActions.manageRules', {
              defaultMessage: 'Manage rules',
            }),
            icon: 'document',
            onClick: noop,
          },
        ],
      },
    ],
  };
}

const METRICS_ALERTS_PANEL_ID = 1;
const METRICS_ALERTS_INFRASTRUCTURE_PANEL_ID = 2;
const METRICS_ALERTS_METRICS_PANEL_ID = 3;

/**
 * Shared header app actions config for Infrastructure inventory, Hosts, and Metrics explorer.
 * Single secondary overflow (•••) with: Add data, Anomaly detection, Alerts (sub-panel), Settings, Feedback.
 * Alerts opens "Alerts and rules" panel with: Infrastructure (sub-panel), Metrics (sub-panel), Manage rules.
 * POC: all actions are dumb (noop). Set when app mounts; platform clears on app change.
 */
export function getMetricsHeaderAppActionsConfig(): ChromeHeaderAppActionsConfig {
  return {
    overflowPanels: [
      {
        id: 0,
        title: '',
        items: [
          {
            name: i18n.translate('xpack.infra.metricsHeaderAppActions.overflowAddData', {
              defaultMessage: 'Add data',
            }),
            icon: 'plusInCircle',
            onClick: noop,
          },
          {
            name: i18n.translate('xpack.infra.metricsHeaderAppActions.overflowAnomalyDetection', {
              defaultMessage: 'Anomaly detection',
            }),
            icon: 'machineLearningApp',
            onClick: noop,
          },
          {
            name: i18n.translate('xpack.infra.metricsHeaderAppActions.overflowAlerts', {
              defaultMessage: 'Alerts',
            }),
            icon: 'bell',
            onClick: noop,
            panel: METRICS_ALERTS_PANEL_ID,
          },
          {
            name: i18n.translate('xpack.infra.metricsHeaderAppActions.overflowSettings', {
              defaultMessage: 'Settings',
            }),
            icon: 'gear',
            onClick: noop,
          },
          {
            name: i18n.translate('xpack.infra.metricsHeaderAppActions.overflowFeedback', {
              defaultMessage: 'Feedback',
            }),
            icon: 'editorComment',
            onClick: noop,
          },
        ],
      },
      {
        id: METRICS_ALERTS_PANEL_ID,
        title: i18n.translate('xpack.infra.metricsHeaderAppActions.alertsPanelTitle', {
          defaultMessage: 'Alerts and rules',
        }),
        items: [
          {
            name: i18n.translate('xpack.infra.metricsHeaderAppActions.alertsPanelInfrastructure', {
              defaultMessage: 'Infrastructure',
            }),
            icon: 'cluster',
            onClick: noop,
            panel: METRICS_ALERTS_INFRASTRUCTURE_PANEL_ID,
          },
          {
            name: i18n.translate('xpack.infra.metricsHeaderAppActions.alertsPanelMetrics', {
              defaultMessage: 'Metrics',
            }),
            icon: 'stats',
            onClick: noop,
            panel: METRICS_ALERTS_METRICS_PANEL_ID,
          },
          {
            name: i18n.translate('xpack.infra.metricsHeaderAppActions.alertsPanelManageRules', {
              defaultMessage: 'Manage rules',
            }),
            icon: 'document',
            onClick: noop,
          },
        ],
      },
      {
        id: METRICS_ALERTS_INFRASTRUCTURE_PANEL_ID,
        title: i18n.translate('xpack.infra.metricsHeaderAppActions.alertsPanelInfrastructure', {
          defaultMessage: 'Infrastructure',
        }),
        items: [
          {
            name: i18n.translate('xpack.infra.metricsHeaderAppActions.alertsPanelManageRules', {
              defaultMessage: 'Manage rules',
            }),
            icon: 'document',
            onClick: noop,
          },
        ],
      },
      {
        id: METRICS_ALERTS_METRICS_PANEL_ID,
        title: i18n.translate('xpack.infra.metricsHeaderAppActions.alertsPanelMetrics', {
          defaultMessage: 'Metrics',
        }),
        items: [
          {
            name: i18n.translate('xpack.infra.metricsHeaderAppActions.alertsPanelManageRules', {
              defaultMessage: 'Manage rules',
            }),
            icon: 'document',
            onClick: noop,
          },
        ],
      },
    ],
  };
}
