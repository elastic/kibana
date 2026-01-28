/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { SubFeatureConfig } from '@kbn/features-plugin/common';
import { EXCEPTION_LIST_NAMESPACE } from '@kbn/securitysolution-list-constants';
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
  CUSTOM_HIGHLIGHTED_FIELDS_API_EDIT,
  CUSTOM_HIGHLIGHTED_FIELDS_SUBFEATURE_EDIT_ID,
  CUSTOM_HIGHLIGHTED_FIELDS_UI_EDIT,
  ENABLE_DISABLE_RULES_API_PRIVILEGE,
  ENABLE_DISABLE_RULES_SUBFEATURE_ID,
  ENABLE_DISABLE_RULES_UI,
  EXCEPTIONS_API_ALL,
  EXCEPTIONS_API_READ,
  EXCEPTIONS_SUBFEATURE_ALL_ID,
  EXCEPTIONS_UI_EDIT,
  EXCEPTIONS_UI_READ,
  INVESTIGATION_GUIDE_API_EDIT,
  INVESTIGATION_GUIDE_SUBFEATURE_EDIT_ID,
  INVESTIGATION_GUIDE_UI_EDIT,
  LEGACY_NOTIFICATIONS_ID,
  LISTS_API_ALL,
  LISTS_API_READ,
  SERVER_APP_ID,
} from '../../constants';

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

export const getExceptionsSubFeature = (): SubFeatureConfig => ({
  name: i18n.translate(
    'securitySolutionPackages.features.featureRegistry.exceptionsSubFeatureName',
    {
      defaultMessage: 'Exceptions',
    }
  ),
  privilegeGroups: [
    {
      groupType: 'independent',
      privileges: [
        {
          id: EXCEPTIONS_SUBFEATURE_ALL_ID,
          includeIn: 'all',
          name: i18n.translate(
            'securitySolutionPackages.features.featureRegistry.subFeatures.manageExceptionPrivilegeName',
            {
              defaultMessage: 'Manage Exceptions',
            }
          ),
          savedObject: {
            all: [EXCEPTION_LIST_NAMESPACE],
            read: [EXCEPTION_LIST_NAMESPACE],
          },
          ui: [EXCEPTIONS_UI_READ, EXCEPTIONS_UI_EDIT],
          api: [EXCEPTIONS_API_READ, EXCEPTIONS_API_ALL, LISTS_API_ALL, LISTS_API_READ],
        },
      ],
    },
  ],
});

export const getInvestigationGuideSubFeature = (): SubFeatureConfig => ({
  name: i18n.translate(
    'securitySolutionPackages.features.featureRegistry.investigationGuideSubFeatureName',
    {
      defaultMessage: 'Investigation guides',
    }
  ),
  privilegeGroups: [
    {
      groupType: 'independent',
      privileges: [
        {
          id: INVESTIGATION_GUIDE_SUBFEATURE_EDIT_ID,
          includeIn: 'all',
          name: i18n.translate(
            'securitySolutionPackages.features.featureRegistry.subFeatures.investigationGuidePrivilegeName',
            {
              defaultMessage: 'Edit investigation guides',
            }
          ),
          savedObject: {
            all: [], // TODO: this might need to be filled
            read: [],
          },
          ui: [INVESTIGATION_GUIDE_UI_EDIT],
          api: [INVESTIGATION_GUIDE_API_EDIT],
        },
      ],
    },
  ],
});

export const getCustomHighlightedFieldsSubFeature = (): SubFeatureConfig => ({
  name: i18n.translate(
    'securitySolutionPackages.features.featureRegistry.customHighlightedFieldsSubFeatureName',
    {
      defaultMessage: 'Custom highlighted fields',
    }
  ),
  privilegeGroups: [
    {
      groupType: 'independent',
      privileges: [
        {
          id: CUSTOM_HIGHLIGHTED_FIELDS_SUBFEATURE_EDIT_ID,
          includeIn: 'all',
          name: i18n.translate(
            'securitySolutionPackages.features.featureRegistry.subFeatures.customHighlightedFieldsPrivilegeName',
            {
              defaultMessage: 'Edit custom highlighted fields',
            }
          ),
          savedObject: {
            all: [], // TODO: this might need to be filled
            read: [],
          },
          ui: [CUSTOM_HIGHLIGHTED_FIELDS_UI_EDIT],
          api: [CUSTOM_HIGHLIGHTED_FIELDS_API_EDIT],
        },
      ],
    },
  ],
});

export const getEnableDisableRulesSubFeature = (): SubFeatureConfig => ({
  name: i18n.translate(
    'securitySolutionPackages.features.featureRegistry.enableDisableSubFeatureName',
    {
      defaultMessage: 'Enable/Disable',
    }
  ),
  privilegeGroups: [
    {
      groupType: 'independent',
      privileges: [
        {
          id: ENABLE_DISABLE_RULES_SUBFEATURE_ID,
          includeIn: 'all',
          name: i18n.translate(
            'securitySolutionPackages.features.featureRegistry.subFeatures.enableDisableRulesPrivilegeName',
            {
              defaultMessage: 'Enable/Disable rules',
            }
          ),
          savedObject: {
            all: [], // TODO: this might need to be filled
            read: [],
          },
          alerting: {
            rule: {
              enable: alertingFeatures,
            },
          },
          ui: [ENABLE_DISABLE_RULES_UI],
          api: [ENABLE_DISABLE_RULES_API_PRIVILEGE],
        },
      ],
    },
  ],
});
