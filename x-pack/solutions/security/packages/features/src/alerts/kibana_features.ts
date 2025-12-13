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
import {
  ALERTS_API_ALL,
  ALERTS_API_READ,
  APP_ID,
  LEGACY_NOTIFICATIONS_ID,
  ALERTS_FEATURE_ID,
  SERVER_APP_ID,
  ALERTS_UI_READ,
  ALERTS_UI_EDIT,
  INITIALIZE_SECURITY_SOLUTION,
  USERS_API_READ,
} from '../constants';
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

export const getAlertsBaseKibanaFeature = (
  params: SecurityFeatureParams
): BaseKibanaFeatureConfig => ({
  id: ALERTS_FEATURE_ID,
  name: i18n.translate(
    'securitySolutionPackages.features.featureRegistry.linkSecuritySolutionRolesAlertsTitle',
    {
      defaultMessage: 'Alerts',
    }
  ),
  order: 1100,
  category: DEFAULT_APP_CATEGORIES.security,
  app: [ALERTS_FEATURE_ID, 'kibana', "securitySolution"],
  catalogue: [APP_ID],
  alerting: alertingFeatures,
  management: {
    insightsAndAlerting: ['triggersActions'], // Access to the stack alerts management UI
  },
  privileges: {
    all: {
      app: ["securitySolution", ALERTS_FEATURE_ID, 'kibana'],
      catalogue: [APP_ID],
      savedObject: {
        all: params.savedObjects,
        read: params.savedObjects,
      },
      alerting: {
        alert: { all: alertingFeatures },
      },
      // TODO: figure out if this should be here
      management: {
        insightsAndAlerting: ['triggersActions'], // Access to the stack alerts management UI
      },
      ui: [ALERTS_UI_READ, ALERTS_UI_EDIT],
      api: [
        'rac',
        // TODO: should it be able to initialize the security solution
        INITIALIZE_SECURITY_SOLUTION,
        ALERTS_API_ALL,
        ALERTS_API_READ,
        USERS_API_READ,
      ],
    },
    read: {
      app: [ALERTS_FEATURE_ID, 'kibana', "securitySolution"],
      catalogue: [APP_ID],
      savedObject: {
        all: [],
        read: params.savedObjects,
      },
      alerting: {
        alert: { read: alertingFeatures },
      },
      management: {
        insightsAndAlerting: ['triggersActions'], // Access to the stack alerts management UI
      },
      ui: [ALERTS_UI_READ],
      api: [
        'rac',
        INITIALIZE_SECURITY_SOLUTION,
        ALERTS_API_READ,
        USERS_API_READ,
      ],
    },
  },
});
