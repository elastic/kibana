/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { DEFAULT_APP_CATEGORIES } from '@kbn/core/server';
import { logViewSavedObjectName } from '@kbn/logs-shared-plugin/server';
import {
  AlertConsumers,
  DEPRECATED_ALERTING_CONSUMERS,
  LOG_THRESHOLD_ALERT_TYPE_ID,
  ML_ANOMALY_DETECTION_RULE_TYPE_ID,
  OBSERVABILITY_THRESHOLD_RULE_TYPE_ID,
} from '@kbn/rule-data-utils';
import { ES_QUERY_ID } from '@kbn/rule-data-utils';
import { ALERTING_FEATURE_ID } from '@kbn/alerting-plugin/common';
import type { KibanaFeatureConfig } from '@kbn/features-plugin/common';
import { KibanaFeatureScope } from '@kbn/features-plugin/common';
import { infraSourceConfigurationSavedObjectName } from '../saved_objects/infra_saved_objects';

const logsRuleTypes = [
  LOG_THRESHOLD_ALERT_TYPE_ID,
  ES_QUERY_ID,
  OBSERVABILITY_THRESHOLD_RULE_TYPE_ID,
  ML_ANOMALY_DETECTION_RULE_TYPE_ID,
];
export const getLogsFeature = (): KibanaFeatureConfig => {
  const logsAlertingFeatures = logsRuleTypes.map((ruleTypeId) => {
    const consumers = [AlertConsumers.LOGS, ALERTING_FEATURE_ID, ...DEPRECATED_ALERTING_CONSUMERS];

    return {
      ruleTypeId,
      consumers,
    };
  });

  const LOGS_FEATURE = {
    id: AlertConsumers.LOGS,
    name: i18n.translate('xpack.observability.featureRegistry.linkLogsTitle', {
      defaultMessage: 'Logs',
    }),
    order: 700,
    category: DEFAULT_APP_CATEGORIES.observability,
    scope: [KibanaFeatureScope.Spaces, KibanaFeatureScope.Security],
    app: ['infra', 'logs', 'kibana', 'observability-logs-explorer'],
    catalogue: ['infralogging', 'logs'],
    management: {
      insightsAndAlerting: ['triggersActions'],
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
          },
          alert: {
            all: logsAlertingFeatures,
          },
        },
        management: {
          insightsAndAlerting: ['triggersActions'],
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
          insightsAndAlerting: ['triggersActions'],
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
