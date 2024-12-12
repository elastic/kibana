/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { SubFeatureConfig } from '@kbn/features-plugin/common';
import { CasesSubFeatureId } from '../../product_features_keys';
import { APP_ID, CASES_FEATURE_ID_V3 } from '../../constants';
import type { CasesFeatureParams } from '../types';

/**
 * Sub-features that will always be available for Security Cases
 * regardless of the product type.
 */
export const getCasesBaseKibanaSubFeatureIdsV2 = (): CasesSubFeatureId[] => [
  CasesSubFeatureId.deleteCases,
  CasesSubFeatureId.casesSettings,
  CasesSubFeatureId.createComment,
  CasesSubFeatureId.reopenCase,
];

/**
 * Defines all the Security Solution Cases subFeatures available.
 * The order of the subFeatures is the order they will be displayed
 */
export const getCasesSubFeaturesMapV2 = ({
  uiCapabilities,
  apiTags,
  savedObjects,
}: CasesFeatureParams) => {
  const deleteCasesSubFeature: SubFeatureConfig = {
    name: i18n.translate('securitySolutionPackages.features.featureRegistry.deleteSubFeatureName', {
      defaultMessage: 'Delete',
    }),
    privilegeGroups: [
      {
        groupType: 'independent',
        privileges: [
          {
            api: apiTags.delete,
            id: 'cases_delete',
            name: i18n.translate(
              'securitySolutionPackages.features.featureRegistry.deleteSubFeatureDetails',
              {
                defaultMessage: 'Delete cases and comments',
              }
            ),
            includeIn: 'all',
            savedObject: {
              all: [...savedObjects.files],
              read: [...savedObjects.files],
            },
            cases: {
              delete: [APP_ID],
            },
            ui: uiCapabilities.delete,
            replacedBy: [{ feature: CASES_FEATURE_ID_V3, privileges: ['cases_delete'] }],
          },
        ],
      },
    ],
  };

  const casesSettingsCasesSubFeature: SubFeatureConfig = {
    name: i18n.translate(
      'securitySolutionPackages.features.featureRegistry.casesSettingsSubFeatureName',
      {
        defaultMessage: 'Case settings',
      }
    ),
    privilegeGroups: [
      {
        groupType: 'independent',
        privileges: [
          {
            id: 'cases_settings',
            name: i18n.translate(
              'securitySolutionPackages.features.featureRegistry.casesSettingsSubFeatureDetails',
              {
                defaultMessage: 'Edit case settings',
              }
            ),
            includeIn: 'all',
            savedObject: {
              all: [...savedObjects.files],
              read: [...savedObjects.files],
            },
            cases: {
              settings: [APP_ID],
            },
            ui: uiCapabilities.settings,
            replacedBy: [{ feature: CASES_FEATURE_ID_V3, privileges: ['cases_settings'] }],
          },
        ],
      },
    ],
  };

  /* The below sub features were newly added in v2 (8.17) */

  const casesAddCommentsCasesSubFeature: SubFeatureConfig = {
    name: i18n.translate(
      'securitySolutionPackages.features.featureRegistry.addCommentsSubFeatureName',
      {
        defaultMessage: 'Create comments & attachments',
      }
    ),
    privilegeGroups: [
      {
        groupType: 'independent',
        privileges: [
          {
            api: apiTags.createComment,
            id: 'create_comment',
            name: i18n.translate(
              'securitySolutionPackages.features.featureRegistry.addCommentsSubFeatureDetails',
              {
                defaultMessage: 'Add comments to cases',
              }
            ),
            includeIn: 'all',
            savedObject: {
              all: [...savedObjects.files],
              read: [...savedObjects.files],
            },
            cases: {
              createComment: [APP_ID],
            },
            ui: uiCapabilities.createComment,
            replacedBy: [{ feature: CASES_FEATURE_ID_V3, privileges: ['create_comment'] }],
          },
        ],
      },
    ],
  };
  const casesreopenCaseSubFeature: SubFeatureConfig = {
    name: i18n.translate(
      'securitySolutionPackages.features.featureRegistry.reopenCaseSubFeatureName',
      {
        defaultMessage: 'Re-open',
      }
    ),
    privilegeGroups: [
      {
        groupType: 'independent',
        privileges: [
          {
            id: 'case_reopen',
            name: i18n.translate(
              'securitySolutionPackages.features.featureRegistry.reopenCaseSubFeatureDetails',
              {
                defaultMessage: 'Re-open closed cases',
              }
            ),
            includeIn: 'all',
            savedObject: {
              all: [],
              read: [],
            },
            cases: {
              reopenCase: [APP_ID],
            },
            ui: uiCapabilities.reopenCase,
            replacedBy: [{ feature: CASES_FEATURE_ID_V3, privileges: ['case_reopen'] }],
          },
        ],
      },
    ],
  };

  return new Map<CasesSubFeatureId, SubFeatureConfig>([
    [CasesSubFeatureId.deleteCases, deleteCasesSubFeature],
    [CasesSubFeatureId.casesSettings, casesSettingsCasesSubFeature],
    /* The below sub features were newly added in v2 (8.17) */
    [CasesSubFeatureId.createComment, casesAddCommentsCasesSubFeature],
    [CasesSubFeatureId.reopenCase, casesreopenCaseSubFeature],
  ]);
};
