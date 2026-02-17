/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

import { DEFAULT_APP_CATEGORIES } from '@kbn/core-application-common';
import {
  EQL_RULE_TYPE_ID,
  ESQL_RULE_TYPE_ID,
  INDICATOR_RULE_TYPE_ID,
  ML_RULE_TYPE_ID,
  NEW_TERMS_RULE_TYPE_ID,
  QUERY_RULE_TYPE_ID,
  SAVED_QUERY_RULE_TYPE_ID,
  THRESHOLD_RULE_TYPE_ID,
} from '@kbn/securitysolution-rules';
import {
  APP_ID,
  SECURITY_FEATURE_ID_V2,
  LEGACY_NOTIFICATIONS_ID,
  CLOUD_POSTURE_APP_ID,
  CLOUD_DEFEND_APP_ID,
  SERVER_APP_ID,
  SECURITY_FEATURE_ID_V5,
  LISTS_API_ALL,
  LISTS_API_READ,
  LISTS_API_SUMMARY,
  RULES_FEATURE_ID_V2,
  SECURITY_UI_SHOW,
  SECURITY_UI_CRUD,
  INITIALIZE_SECURITY_SOLUTION,
  RULES_API_READ,
  ALERTS_API_ALL,
  ALERTS_API_READ,
  EXCEPTIONS_API_ALL,
  EXCEPTIONS_API_READ,
  USERS_API_READ,
  RULES_API_ALL,
  EXCEPTIONS_SUBFEATURE_ALL,
} from '../../constants';
import type { SecurityFeatureParams } from '../types';
import type { BaseKibanaFeatureConfig } from '../../types';

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

export const getSecurityV2BaseKibanaFeature = ({
  savedObjects,
}: SecurityFeatureParams): BaseKibanaFeatureConfig => ({
  deprecated: {
    notice: i18n.translate(
      'securitySolutionPackages.features.featureRegistry.linkSecuritySolutionSecurity.deprecationMessage',
      {
        defaultMessage: 'The {currentId} permissions are deprecated, please see {latestId}.',
        values: {
          currentId: SECURITY_FEATURE_ID_V2,
          latestId: SECURITY_FEATURE_ID_V5,
        },
      }
    ),
  },

  id: SECURITY_FEATURE_ID_V2,
  name: i18n.translate(
    'securitySolutionPackages.features.featureRegistry.linkSecuritySolutionTitle',
    {
      defaultMessage: 'Security',
    }
  ),
  order: 1100,
  category: DEFAULT_APP_CATEGORIES.security,
  // scope: [KibanaFeatureScope.Spaces, KibanaFeatureScope.Security],
  app: [APP_ID, CLOUD_POSTURE_APP_ID, CLOUD_DEFEND_APP_ID, 'kibana'],
  catalogue: [APP_ID],
  management: {
    insightsAndAlerting: ['triggersActions'],
  },
  alerting: alertingFeatures,
  description: i18n.translate(
    'securitySolutionPackages.features.featureRegistry.securityGroupDescription',
    {
      defaultMessage:
        "Each sub-feature privilege in this group must be assigned individually. Global assignment is only supported if your pricing plan doesn't allow individual feature privileges.",
    }
  ),
  privileges: {
    all: {
      replacedBy: {
        default: [
          // note: overriden by product feature endpointArtifactManagement when enabled
          { feature: SECURITY_FEATURE_ID_V5, privileges: ['all'] },
          { feature: RULES_FEATURE_ID_V2, privileges: ['all'] },
        ],
        minimal: [
          // note: overriden by product feature endpointArtifactManagement when enabled
          { feature: SECURITY_FEATURE_ID_V5, privileges: ['minimal_all'] },
          {
            feature: RULES_FEATURE_ID_V2,
            privileges: ['minimal_all', EXCEPTIONS_SUBFEATURE_ALL],
          },
        ],
      },
      app: [APP_ID, CLOUD_POSTURE_APP_ID, CLOUD_DEFEND_APP_ID, 'kibana'],
      catalogue: [APP_ID],
      api: [
        APP_ID,
        'rac',
        LISTS_API_ALL,
        LISTS_API_READ,
        LISTS_API_SUMMARY,
        RULES_API_ALL,
        RULES_API_READ,
        ALERTS_API_ALL,
        ALERTS_API_READ,
        EXCEPTIONS_API_ALL,
        EXCEPTIONS_API_READ,
        USERS_API_READ,
        INITIALIZE_SECURITY_SOLUTION,
      ],
      savedObject: {
        all: ['alert', ...savedObjects],
        read: [],
      },
      alerting: {
        rule: { all: alertingFeatures },
        alert: { all: alertingFeatures },
      },
      management: {
        insightsAndAlerting: ['triggersActions'],
      },
      ui: [SECURITY_UI_SHOW, SECURITY_UI_CRUD],
    },
    read: {
      replacedBy: {
        default: [
          { feature: SECURITY_FEATURE_ID_V5, privileges: ['read'] },
          { feature: RULES_FEATURE_ID_V2, privileges: ['read'] },
        ],
        minimal: [
          { feature: SECURITY_FEATURE_ID_V5, privileges: ['minimal_read'] },
          {
            feature: RULES_FEATURE_ID_V2,
            privileges: ['minimal_read'],
          },
        ],
      },
      app: [APP_ID, CLOUD_POSTURE_APP_ID, CLOUD_DEFEND_APP_ID, 'kibana'],
      catalogue: [APP_ID],
      api: [
        APP_ID,
        'rac',
        LISTS_API_READ,
        RULES_API_READ,
        ALERTS_API_READ,
        EXCEPTIONS_API_READ,
        USERS_API_READ,
        INITIALIZE_SECURITY_SOLUTION,
      ],
      savedObject: {
        all: [],
        read: [...savedObjects],
      },
      alerting: {
        rule: {
          read: alertingFeatures,
        },
        alert: {
          all: alertingFeatures,
        },
      },
      management: {
        insightsAndAlerting: ['triggersActions'],
      },
      ui: [SECURITY_UI_SHOW],
    },
  },
});
