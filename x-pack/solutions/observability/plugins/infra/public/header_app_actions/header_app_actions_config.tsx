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

/**
 * Header app actions config for the Metrics app (Infrastructure inventory, Hosts, Metrics explorer).
 * Overflow menu contains the former app menu items (Feedback, Anomaly detection, Alerts and rules, Add data, Settings).
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
            name: i18n.translate('xpack.infra.metricsHeaderAppActions.overflowAnomalyDetection', {
              defaultMessage: 'Anomaly detection',
            }),
            icon: 'machineLearningApp',
            onClick: noop,
          },
          {
            name: i18n.translate('xpack.infra.metricsHeaderAppActions.overflowAlertsAndRules', {
              defaultMessage: 'Alerts and rules',
            }),
            icon: 'bell',
            onClick: noop,
          },
          {
            name: i18n.translate('xpack.infra.metricsHeaderAppActions.overflowAddData', {
              defaultMessage: 'Add data',
            }),
            icon: 'plusInCircle',
            onClick: noop,
          },
          { isSeparator: true as const, key: 'sepSettings' },
          {
            name: i18n.translate('xpack.infra.metricsHeaderAppActions.overflowSettings', {
              defaultMessage: 'Settings',
            }),
            icon: 'gear',
            onClick: noop,
          },
          { isSeparator: true as const, key: 'sepFeedback' },
          {
            name: i18n.translate('xpack.infra.metricsHeaderAppActions.overflowFeedback', {
              defaultMessage: 'Feedback',
            }),
            icon: 'editorComment',
            onClick: noop,
          },
        ],
      },
    ],
  };
}
