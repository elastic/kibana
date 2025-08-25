/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { KibanaFeatureScope } from '@kbn/features-plugin/common';

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
  SERVER_APP_ID,
  SECURITY_FEATURE_ID_V3,
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
          latestId: SECURITY_FEATURE_ID_V3,
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
  scope: [KibanaFeatureScope.Spaces, KibanaFeatureScope.Security],
  app: [APP_ID, CLOUD_POSTURE_APP_ID, 'kibana'],
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
          { feature: SECURITY_FEATURE_ID_V3, privileges: ['all'] },
        ],
        minimal: [
          // note: overriden by product feature endpointArtifactManagement when enabled
          { feature: SECURITY_FEATURE_ID_V3, privileges: ['minimal_all'] },
        ],
      },
      app: [APP_ID, CLOUD_POSTURE_APP_ID, 'kibana'],
      catalogue: [APP_ID],
      api: [APP_ID, 'rac', 'lists-all', 'lists-read', 'lists-summary'],
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
      ui: ['show', 'crud'],
    },
    read: {
      replacedBy: {
        default: [{ feature: SECURITY_FEATURE_ID_V3, privileges: ['read'] }],
        minimal: [{ feature: SECURITY_FEATURE_ID_V3, privileges: ['minimal_read'] }],
      },
      app: [APP_ID, CLOUD_POSTURE_APP_ID, 'kibana'],
      catalogue: [APP_ID],
      api: [APP_ID, 'rac', 'lists-read'],
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
      ui: ['show'],
    },
  },
});
