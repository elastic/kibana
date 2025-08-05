/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { DEFAULT_APP_CATEGORIES } from '@kbn/core/server';
import { KibanaFeatureConfig, KibanaFeatureScope } from '@kbn/features-plugin/common';
import {
  METRIC_THRESHOLD_ALERT_TYPE_ID,
  METRIC_INVENTORY_THRESHOLD_ALERT_TYPE_ID,
  OBSERVABILITY_THRESHOLD_RULE_TYPE_ID,
  AlertConsumers,
  LOG_THRESHOLD_ALERT_TYPE_ID,
} from '@kbn/rule-data-utils';
import { ALERTING_FEATURE_ID } from '@kbn/alerting-plugin/common';
import { INFRA_UI_SO_TYPE } from '@kbn/observability-shared-plugin/common/saved_object_types';

const infraRuleTypes = [
  METRIC_THRESHOLD_ALERT_TYPE_ID,
  METRIC_INVENTORY_THRESHOLD_ALERT_TYPE_ID,
  OBSERVABILITY_THRESHOLD_RULE_TYPE_ID,
  LOG_THRESHOLD_ALERT_TYPE_ID,
];

const baseConsumers = [ALERTING_FEATURE_ID, AlertConsumers.OBSERVABILITY];

// Consolidated privileges for all rule/alert types
const observabilityRulePrivileges = [
  ...infraRuleTypes.map((ruleTypeId) => ({
    ruleTypeId,
    consumers: [AlertConsumers.LOGS, ...baseConsumers],
  })),
];

const savedObjectTypes = [INFRA_UI_SO_TYPE];

export const getManageRulesFeature = (): KibanaFeatureConfig => ({
  id: 'observabilityManageRules',
  name: i18n.translate('xpack.observability.features.manageRulesTitle', {
    defaultMessage: 'Observability Rules and Alerts',
  }),
  order: 1300,
  category: DEFAULT_APP_CATEGORIES.observability,
  scope: [KibanaFeatureScope.Spaces, KibanaFeatureScope.Security],
  app: ['kibana'],
  catalogue: ['observability'],
  management: {
    insightsAndAlerting: ['triggersActions'],
  },
  alerting: observabilityRulePrivileges,
  privileges: {
    all: {
      app: ['kibana'],
      catalogue: ['observability'],
      api: ['rac'],
      savedObject: {
        all: [],
        read: savedObjectTypes,
      },
      alerting: {
        rule: { all: observabilityRulePrivileges },
        alert: { all: observabilityRulePrivileges },
      },
      management: {
        insightsAndAlerting: ['triggersActions'],
      },
      ui: ['save', 'show'],
    },
    read: {
      app: ['kibana'],
      catalogue: ['observability'],
      api: ['rac'],
      savedObject: {
        all: [],
        read: savedObjectTypes,
      },
      alerting: {
        rule: { read: observabilityRulePrivileges },
        alert: { read: observabilityRulePrivileges },
      },
      management: {
        insightsAndAlerting: ['triggersActions'],
      },
      ui: ['show'],
    },
  },
});
