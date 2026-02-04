/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DEFAULT_APP_CATEGORIES } from '@kbn/core-application-common';
import { i18n } from '@kbn/i18n';

import {
  ESQL_RULE_TYPE_ID,
  EQL_RULE_TYPE_ID,
  INDICATOR_RULE_TYPE_ID,
  ML_RULE_TYPE_ID,
  QUERY_RULE_TYPE_ID,
  SAVED_QUERY_RULE_TYPE_ID,
  THRESHOLD_RULE_TYPE_ID,
  NEW_TERMS_RULE_TYPE_ID,
} from '@kbn/securitysolution-rules';
import { EXCEPTION_LIST_NAMESPACE_AWARE } from '@kbn/securitysolution-list-constants';

import {
  ALERTS_API_ALL,
  ALERTS_API_READ,
  APP_ID,
  EXCEPTIONS_API_READ,
  EXCEPTIONS_UI_READ,
  INITIALIZE_SECURITY_SOLUTION,
  LEGACY_NOTIFICATIONS_ID,
  LISTS_API_ALL,
  LISTS_API_READ,
  LISTS_API_SUMMARY,
  RULES_API_ALL,
  RULES_API_READ,
  RULES_FEATURE_ID_V2,
  RULES_UI_EDIT,
  RULES_UI_READ,
  SECURITY_SOLUTION_RULES_APP_ID,
  SERVER_APP_ID,
  USERS_API_READ,
} from '../../constants';
import { type BaseKibanaFeatureConfig } from '../../types';
import type { SecurityFeatureParams } from '../../security/types';

const SECURITY_RULE_TYPES = [
  LEGACY_NOTIFICATIONS_ID,
  ESQL_RULE_TYPE_ID,
  EQL_RULE_TYPE_ID,
  INDICATOR_RULE_TYPE_ID,
  ML_RULE_TYPE_ID,
  QUERY_RULE_TYPE_ID,
  SAVED_QUERY_RULE_TYPE_ID,
  THRESHOLD_RULE_TYPE_ID,
  NEW_TERMS_RULE_TYPE_ID,
];

const alertingFeatures = SECURITY_RULE_TYPES.map((ruleTypeId) => ({
  ruleTypeId,
  consumers: [SERVER_APP_ID],
}));

export const getRulesV2BaseKibanaFeature = (
  params: SecurityFeatureParams
): BaseKibanaFeatureConfig => ({
  id: RULES_FEATURE_ID_V2,
  name: i18n.translate(
    'securitySolutionPackages.features.featureRegistry.linkSecuritySolutionRulesV2Title',
    {
      defaultMessage: 'Rules, Alerts, and Exceptions',
    }
  ),
  order: 1100,
  category: DEFAULT_APP_CATEGORIES.security,
  app: [SECURITY_SOLUTION_RULES_APP_ID, 'kibana'],
  catalogue: [APP_ID],
  alerting: alertingFeatures,
  management: {
    insightsAndAlerting: ['triggersActions'], // Access to the stack rules management UI
  },
  privileges: {
    all: {
      app: [SECURITY_SOLUTION_RULES_APP_ID, 'kibana'],
      catalogue: [APP_ID],
      savedObject: {
        all: params.savedObjects.filter((so) => so !== EXCEPTION_LIST_NAMESPACE_AWARE),
        read: params.savedObjects,
      },
      alerting: {
        rule: { all: alertingFeatures },
        alert: { all: alertingFeatures },
      },
      management: {
        insightsAndAlerting: ['triggersActions'], // Access to the stack rules management UI
      },
      ui: [RULES_UI_READ, RULES_UI_EDIT, EXCEPTIONS_UI_READ],
      api: [
        RULES_API_ALL,
        RULES_API_READ,
        ALERTS_API_ALL,
        ALERTS_API_READ,
        LISTS_API_ALL,
        LISTS_API_READ,
        LISTS_API_SUMMARY,
        EXCEPTIONS_API_READ,
        USERS_API_READ,
        INITIALIZE_SECURITY_SOLUTION,
        'rac',
      ],
    },
    read: {
      app: [SECURITY_SOLUTION_RULES_APP_ID, 'kibana'],
      catalogue: [APP_ID],
      savedObject: {
        all: [],
        read: params.savedObjects,
      },
      alerting: {
        rule: { read: alertingFeatures },
        alert: { all: alertingFeatures },
      },
      management: {
        insightsAndAlerting: ['triggersActions'], // Access to the stack rules management UI
      },
      ui: [RULES_UI_READ, EXCEPTIONS_UI_READ],
      api: [
        RULES_API_READ,
        ALERTS_API_READ,
        LISTS_API_READ,
        EXCEPTIONS_API_READ,
        USERS_API_READ,
        INITIALIZE_SECURITY_SOLUTION,
        'rac',
      ],
    },
  },
});
