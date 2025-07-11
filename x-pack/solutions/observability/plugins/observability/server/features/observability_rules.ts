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
  SYNTHETICS_RULE_TYPE_IDS,
  UPTIME_RULE_TYPE_IDS,
  ApmRuleType,
  METRIC_THRESHOLD_ALERT_TYPE_ID,
  METRIC_INVENTORY_THRESHOLD_ALERT_TYPE_ID,
  OBSERVABILITY_THRESHOLD_RULE_TYPE_ID,
  SLO_BURN_RATE_RULE_TYPE_ID,
  DEPRECATED_ALERTING_CONSUMERS,
  STACK_ALERTS_FEATURE_ID,
  AlertConsumers,
  STACK_RULE_TYPE_IDS_SUPPORTED_BY_OBSERVABILITY,
  LOG_THRESHOLD_ALERT_TYPE_ID,
} from '@kbn/rule-data-utils';
import { ALERTING_FEATURE_ID } from '@kbn/alerting-plugin/common';
import { sloFeatureId, APM_SERVER_FEATURE_ID, SYNTHETICS_FEATURE_ID } from '../../common';

const syntheticsRuleTypes = [...SYNTHETICS_RULE_TYPE_IDS, ...UPTIME_RULE_TYPE_IDS];
const apmRuleTypes = Object.values(ApmRuleType);
const infraRuleTypes = [
  METRIC_THRESHOLD_ALERT_TYPE_ID,
  METRIC_INVENTORY_THRESHOLD_ALERT_TYPE_ID,
  OBSERVABILITY_THRESHOLD_RULE_TYPE_ID,
  LOG_THRESHOLD_ALERT_TYPE_ID,
];
const sloRuleTypes = [SLO_BURN_RATE_RULE_TYPE_ID];
const stackRuleTypes = STACK_RULE_TYPE_IDS_SUPPORTED_BY_OBSERVABILITY;

const baseConsumers = [
  ALERTING_FEATURE_ID,
  STACK_ALERTS_FEATURE_ID,
  ...DEPRECATED_ALERTING_CONSUMERS,
];

// Consolidated privileges for all rule/alert types
const observabilityRulePrivileges = [
  ...syntheticsRuleTypes.map((ruleTypeId) => ({
    ruleTypeId,
    consumers: [SYNTHETICS_FEATURE_ID, ...baseConsumers],
  })),
  ...apmRuleTypes.map((ruleTypeId) => ({
    ruleTypeId,
    consumers: [APM_SERVER_FEATURE_ID, ...baseConsumers],
  })),
  ...infraRuleTypes.map((ruleTypeId) => ({
    ruleTypeId,
    consumers: [AlertConsumers.LOGS, ...baseConsumers],
  })),
  ...sloRuleTypes.map((ruleTypeId) => ({
    ruleTypeId,
    consumers: [sloFeatureId, ...baseConsumers],
  })),
  ...stackRuleTypes.map((ruleTypeId) => ({
    ruleTypeId,
    consumers: [STACK_ALERTS_FEATURE_ID],
  })),
];

export const getManageRulesFeature = (): KibanaFeatureConfig => ({
  id: 'observabilityManageRules',
  name: i18n.translate('xpack.observability.features.manageRulesTitle', {
    defaultMessage: 'Observability Rules and Alerts',
  }),
  order: 1300,
  category: DEFAULT_APP_CATEGORIES.observability,
  scope: [KibanaFeatureScope.Spaces, KibanaFeatureScope.Security],
  app: ['kibana'],
  catalogue: [],
  management: {
    insightsAndAlerting: ['triggersActions'],
  },
  alerting: observabilityRulePrivileges,
  privileges: {
    all: {
      app: ['kibana'],
      catalogue: [],
      api: ['rac'],
      savedObject: {
        all: [],
        read: [],
      },
      alerting: {
        rule: { all: observabilityRulePrivileges },
        alert: { all: observabilityRulePrivileges },
      },
      management: {
        insightsAndAlerting: ['triggersActions'],
      },
      ui: ['show'],
    },
    read: {
      app: ['kibana'],
      catalogue: [],
      api: ['rac'],
      savedObject: {
        all: [],
        read: [],
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
