/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DEFAULT_APP_CATEGORIES } from '@kbn/core-application-common';
import { i18n } from '@kbn/i18n';
import { KibanaFeatureScope } from '@kbn/features-plugin/common';

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
import { APP_ID, LEGACY_NOTIFICATIONS_ID, RULES_FEATURE_ID, SERVER_APP_ID } from '../constants';
import { type BaseKibanaFeatureConfig } from '../types';
import type { SecurityFeatureParams } from '../security/types';

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

export const getRulesBaseKibanaFeature = (
  params: SecurityFeatureParams
): BaseKibanaFeatureConfig => ({
  id: RULES_FEATURE_ID,
  name: i18n.translate(
    'securitySolutionPackages.features.featureRegistry.linkSecuritySolutionExceptionsTitle',
    {
      defaultMessage: 'Rules',
    }
  ),
  order: 1100,
  category: DEFAULT_APP_CATEGORIES.security,
  scope: [KibanaFeatureScope.Spaces, KibanaFeatureScope.Security],
  app: [RULES_FEATURE_ID, 'kibana'],
  catalogue: [APP_ID],
  alerting: alertingFeatures,
  privileges: {
    all: {
      app: [RULES_FEATURE_ID, 'kibana'],
      catalogue: [APP_ID],
      savedObject: {
        all: params.savedObjects,
        read: params.savedObjects,
      },
      alerting: {
        rule: { all: alertingFeatures },
        alert: { all: alertingFeatures },
      },
      ui: ['readRules', 'crudRules'],
      api: ['security-rules-all', 'security-rules-read', 'exceptions_read', 'exceptions_write'],
    },
    read: {
      app: [RULES_FEATURE_ID, 'kibana'],
      catalogue: [APP_ID],
      savedObject: {
        all: [],
        read: params.savedObjects,
      },
      alerting: {
        rule: {
          read: alertingFeatures,
        },
        alert: {
          all: alertingFeatures,
        },
      },
      ui: ['readRules'],
      api: ['security-rules-all', 'security-rules-read', 'exceptions_read'],
    },
  },
});
