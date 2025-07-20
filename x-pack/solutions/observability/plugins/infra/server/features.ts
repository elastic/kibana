/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { DEFAULT_APP_CATEGORIES } from '@kbn/core/server';
import {
  DEPRECATED_ALERTING_CONSUMERS,
  ML_ANOMALY_DETECTION_RULE_TYPE_ID,
  OBSERVABILITY_THRESHOLD_RULE_TYPE_ID,
} from '@kbn/rule-data-utils';
import { ES_QUERY_ID } from '@kbn/rule-data-utils';
import { metricsDataSourceSavedObjectName } from '@kbn/metrics-data-access-plugin/server';
import { ALERTING_FEATURE_ID } from '@kbn/alerting-plugin/common';
import type { KibanaFeatureConfig } from '@kbn/features-plugin/common';
import { KibanaFeatureScope } from '@kbn/features-plugin/common';
import {
  METRIC_INVENTORY_THRESHOLD_ALERT_TYPE_ID,
  METRIC_THRESHOLD_ALERT_TYPE_ID,
} from '../common/alerting/metrics';
import { METRICS_FEATURE_ID } from '../common/constants';

const metricRuleTypes = [
  METRIC_THRESHOLD_ALERT_TYPE_ID,
  METRIC_INVENTORY_THRESHOLD_ALERT_TYPE_ID,
  ES_QUERY_ID,
  OBSERVABILITY_THRESHOLD_RULE_TYPE_ID,
  ML_ANOMALY_DETECTION_RULE_TYPE_ID,
];

export const getMetricsFeature = (): KibanaFeatureConfig => {
  const metricAlertingFeatures = metricRuleTypes.map((ruleTypeId) => {
    const consumers = [METRICS_FEATURE_ID, ALERTING_FEATURE_ID, ...DEPRECATED_ALERTING_CONSUMERS];

    return {
      ruleTypeId,
      consumers,
    };
  });

  const METRICS_FEATURE = {
    id: METRICS_FEATURE_ID,
    name: i18n.translate('xpack.infra.featureRegistry.linkInfrastructureTitle', {
      defaultMessage: 'Infrastructure',
    }),
    order: 800,
    category: DEFAULT_APP_CATEGORIES.observability,
    scope: [KibanaFeatureScope.Spaces, KibanaFeatureScope.Security],
    app: ['infra', 'metrics', 'kibana'],
    catalogue: ['infraops', 'metrics'],
    management: {
      insightsAndAlerting: ['triggersActions'],
    },
    alerting: metricAlertingFeatures,
    privileges: {
      all: {
        app: ['infra', 'metrics', 'kibana'],
        catalogue: ['infraops', 'metrics'],
        api: ['infra', 'rac'],
        savedObject: {
          all: ['infrastructure-ui-source', metricsDataSourceSavedObjectName],
          read: ['index-pattern'],
        },
        alerting: {
          rule: {
            all: metricAlertingFeatures,
          },
          alert: {
            all: metricAlertingFeatures,
          },
        },
        management: {
          insightsAndAlerting: ['triggersActions'],
        },
        ui: ['show', 'configureSource', 'save'],
      },
      read: {
        app: ['infra', 'metrics', 'kibana'],
        catalogue: ['infraops', 'metrics'],
        api: ['infra', 'rac'],
        savedObject: {
          all: [],
          read: ['infrastructure-ui-source', 'index-pattern', metricsDataSourceSavedObjectName],
        },
        alerting: {
          rule: {
            read: metricAlertingFeatures,
          },
          alert: {
            read: metricAlertingFeatures,
          },
        },
        management: {
          insightsAndAlerting: ['triggersActions'],
        },
        ui: ['show'],
      },
    },
  };
  return METRICS_FEATURE;
};
