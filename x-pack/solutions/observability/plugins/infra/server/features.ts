/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { DEFAULT_APP_CATEGORIES } from '@kbn/core/server';
import { METRIC_ALERTING_FEATURES_WITH_SHARED } from '@kbn/rule-data-utils';
import { metricsDataSourceSavedObjectName } from '@kbn/metrics-data-access-plugin/server';
import type { KibanaFeatureConfig } from '@kbn/features-plugin/common';
import { METRICS_FEATURE_ID } from '../common/constants';

export const getMetricsFeature = (): KibanaFeatureConfig => {
  const metricAlertingFeatures = METRIC_ALERTING_FEATURES_WITH_SHARED;

  const METRICS_FEATURE = {
    id: METRICS_FEATURE_ID,
    name: i18n.translate('xpack.infra.featureRegistry.linkInfrastructureTitle', {
      defaultMessage: 'Infrastructure',
    }),
    order: 800,
    category: DEFAULT_APP_CATEGORIES.observability,
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
            enable: metricAlertingFeatures,
            manual_run: metricAlertingFeatures,
            manage_rule_settings: metricAlertingFeatures,
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
