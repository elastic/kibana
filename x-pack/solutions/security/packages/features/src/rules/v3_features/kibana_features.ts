/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DEFAULT_APP_CATEGORIES } from '@kbn/core-application-common';
import { i18n } from '@kbn/i18n';

import { SECURITY_SOLUTION_RULE_TYPE_IDS } from '@kbn/securitysolution-rules';
import { EXCEPTION_LIST_NAMESPACE_AWARE } from '@kbn/securitysolution-list-constants';

import { DATA_VIEW_SAVED_OBJECT_TYPE } from '@kbn/data-views-plugin/common';
import {
  APP_ID,
  CUSTOM_HIGHLIGHTED_FIELDS_SUBFEATURE_EDIT_ID,
  ENABLE_DISABLE_RULES_SUBFEATURE_ID,
  MANUAL_RUN_RULES_SUBFEATURE_ID,
  EXCEPTIONS_API_READ,
  EXCEPTIONS_UI_READ,
  INITIALIZE_SECURITY_SOLUTION,
  INVESTIGATION_GUIDE_SUBFEATURE_EDIT_ID,
  LEGACY_NOTIFICATIONS_ID,
  LISTS_API_ALL,
  LISTS_API_READ,
  LISTS_API_SUMMARY,
  RULES_API_ALL,
  RULES_API_READ,
  RULES_FEATURE_ID_V3,
  RULES_FEATURE_ID_V4,
  RULES_UI_EDIT,
  RULES_UI_READ,
  SECURITY_SOLUTION_RULES_APP_ID,
  SERVER_APP_ID,
  USERS_API_READ,
  RULES_MANAGEMENT_SETTINGS_SUBFEATURE_ID,
} from '../../constants';
import { type BaseKibanaFeatureConfig } from '../../types';
import type { SecurityFeatureParams } from '../../security/types';

const alertingFeatures = [LEGACY_NOTIFICATIONS_ID, ...SECURITY_SOLUTION_RULE_TYPE_IDS].map(
  (ruleTypeId) => ({
    ruleTypeId,
    consumers: [SERVER_APP_ID],
  })
);

export const getRulesV3BaseKibanaFeature = (
  params: SecurityFeatureParams
): BaseKibanaFeatureConfig => ({
  deprecated: {
    notice: i18n.translate(
      'securitySolutionPackages.features.featureRegistry.linkSecuritySolutionSecurity.deprecationMessage',
      {
        defaultMessage: 'The {currentId} permissions are deprecated, please see {latestId}.',
        values: {
          currentId: RULES_FEATURE_ID_V3,
          latestId: RULES_FEATURE_ID_V4,
        },
      }
    ),
  },
  id: RULES_FEATURE_ID_V3,
  name: i18n.translate(
    'securitySolutionPackages.features.featureRegistry.linkSecuritySolutionRulesV3Title',
    {
      defaultMessage: 'Rules and Exceptions',
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
      replacedBy: {
        default: [{ feature: RULES_FEATURE_ID_V4, privileges: ['all'] }],
        minimal: [
          {
            feature: RULES_FEATURE_ID_V4,
            privileges: [
              'minimal_all',
              INVESTIGATION_GUIDE_SUBFEATURE_EDIT_ID,
              CUSTOM_HIGHLIGHTED_FIELDS_SUBFEATURE_EDIT_ID,
              ENABLE_DISABLE_RULES_SUBFEATURE_ID,
              MANUAL_RUN_RULES_SUBFEATURE_ID,
              RULES_MANAGEMENT_SETTINGS_SUBFEATURE_ID,
            ],
          },
        ],
      },
      app: [SECURITY_SOLUTION_RULES_APP_ID, 'kibana'],
      catalogue: [APP_ID],
      savedObject: {
        all: params.savedObjects.filter((so) => so !== EXCEPTION_LIST_NAMESPACE_AWARE),
        read: [...params.savedObjects, DATA_VIEW_SAVED_OBJECT_TYPE],
      },
      alerting: {
        rule: {
          all: alertingFeatures,
          enable: alertingFeatures,
          manual_run: alertingFeatures,
          manage_rule_settings: alertingFeatures,
        },
      },
      management: {
        insightsAndAlerting: ['triggersActions'], // Access to the stack rules management UI
      },
      ui: [RULES_UI_READ, RULES_UI_EDIT, EXCEPTIONS_UI_READ],
      api: [
        RULES_API_ALL,
        RULES_API_READ,
        LISTS_API_ALL,
        LISTS_API_READ,
        LISTS_API_SUMMARY,
        USERS_API_READ,
        EXCEPTIONS_API_READ,
        INITIALIZE_SECURITY_SOLUTION,
        'rac',
      ],
    },
    read: {
      replacedBy: {
        default: [{ feature: RULES_FEATURE_ID_V4, privileges: ['read'] }],
        minimal: [
          {
            feature: RULES_FEATURE_ID_V4,
            privileges: ['minimal_read'],
          },
        ],
      },
      app: [SECURITY_SOLUTION_RULES_APP_ID, 'kibana'],
      catalogue: [APP_ID],
      savedObject: {
        all: [],
        read: [...params.savedObjects, DATA_VIEW_SAVED_OBJECT_TYPE],
      },
      alerting: {
        rule: { read: alertingFeatures },
      },
      management: {
        insightsAndAlerting: ['triggersActions'], // Access to the stack rules management UI
      },
      ui: [RULES_UI_READ, EXCEPTIONS_UI_READ],
      api: [
        RULES_API_READ,
        LISTS_API_READ,
        USERS_API_READ,
        EXCEPTIONS_API_READ,
        INITIALIZE_SECURITY_SOLUTION,
        'rac',
      ],
    },
  },
});
