/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { DEFAULT_APP_CATEGORIES } from '@kbn/core/server';
import { logViewSavedObjectName } from '@kbn/logs-shared-plugin/server';
import { AlertConsumers, LOG_ALERTING_FEATURES_WITH_SHARED } from '@kbn/rule-data-utils';
import type { KibanaFeatureConfig } from '@kbn/features-plugin/common';
import { infraSourceConfigurationSavedObjectName } from '../saved_objects/infra_saved_objects';

export const getLogsFeature = (): KibanaFeatureConfig => {
  const logsAlertingFeatures = LOG_ALERTING_FEATURES_WITH_SHARED;

  const LOGS_FEATURE = {
    id: AlertConsumers.LOGS,
    name: i18n.translate('xpack.observability.featureRegistry.linkLogsTitle', {
      defaultMessage: 'Logs',
    }),
    order: 700,
    category: DEFAULT_APP_CATEGORIES.observability,
    app: ['infra', 'logs', 'kibana', 'observability-logs-explorer'],
    catalogue: ['infralogging', 'logs'],
    management: {
      insightsAndAlerting: ['triggersActionsRules', 'triggersActionsAlerts'],
    },
    alerting: logsAlertingFeatures,
    privileges: {
      all: {
        app: ['infra', 'logs', 'kibana', 'observability-logs-explorer'],
        catalogue: ['infralogging', 'logs'],
        api: ['infra', 'rac'],
        savedObject: {
          all: [infraSourceConfigurationSavedObjectName, logViewSavedObjectName],
          read: [],
        },
        alerting: {
          rule: {
            all: logsAlertingFeatures,
            enable: logsAlertingFeatures,
            manual_run: logsAlertingFeatures,
            manage_rule_settings: logsAlertingFeatures,
          },
          alert: {
            all: logsAlertingFeatures,
          },
        },
        management: {
          insightsAndAlerting: ['triggersActionsRules', 'triggersActionsAlerts'],
        },
        ui: ['show', 'configureSource', 'save'],
      },
      read: {
        app: ['infra', 'logs', 'kibana', 'observability-logs-explorer'],
        catalogue: ['infralogging', 'logs'],
        api: ['infra', 'rac'],
        alerting: {
          rule: {
            read: logsAlertingFeatures,
          },
          alert: {
            read: logsAlertingFeatures,
          },
        },
        management: {
          insightsAndAlerting: ['triggersActionsRules', 'triggersActionsAlerts'],
        },
        savedObject: {
          all: [],
          read: [infraSourceConfigurationSavedObjectName, logViewSavedObjectName],
        },
        ui: ['show'],
      },
    },
  };
  return LOGS_FEATURE;
};
