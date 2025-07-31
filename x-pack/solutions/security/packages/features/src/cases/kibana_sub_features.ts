/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { SubFeatureConfig } from '@kbn/features-plugin/common';
import { APP_ID } from '../constants';
import type { CasesFeatureParams } from './types';

export const getDeleteCasesSubFeature = ({
  apiTags,
  uiCapabilities,
  savedObjects,
}: CasesFeatureParams): SubFeatureConfig => ({
  name: i18n.translate('securitySolutionPackages.features.featureRegistry.deleteSubFeatureName', {
    defaultMessage: 'Delete',
  }),
  privilegeGroups: [
    {
      groupType: 'independent',
      privileges: [
        {
          api: apiTags.default.delete,
          id: 'cases_delete',
          name: i18n.translate(
            'securitySolutionPackages.features.featureRegistry.deleteSubFeatureDetails',
            { defaultMessage: 'Delete cases and comments' }
          ),
          includeIn: 'all',
          savedObject: {
            all: [...savedObjects.files],
            read: [...savedObjects.files],
          },
          cases: {
            delete: [APP_ID],
          },
          ui: uiCapabilities.default.delete,
        },
      ],
    },
  ],
});

export const getCasesSettingsCasesSubFeature = ({
  uiCapabilities,
  savedObjects,
}: CasesFeatureParams): SubFeatureConfig => ({
  name: i18n.translate(
    'securitySolutionPackages.features.featureRegistry.casesSettingsSubFeatureName',
    { defaultMessage: 'Case settings' }
  ),
  privilegeGroups: [
    {
      groupType: 'independent',
      privileges: [
        {
          id: 'cases_settings',
          name: i18n.translate(
            'securitySolutionPackages.features.featureRegistry.casesSettingsSubFeatureDetails',
            { defaultMessage: 'Edit case settings' }
          ),
          includeIn: 'all',
          savedObject: {
            all: [...savedObjects.files],
            read: [...savedObjects.files],
          },
          cases: {
            settings: [APP_ID],
          },
          ui: uiCapabilities.default.settings,
        },
      ],
    },
  ],
});

export const getCasesAddCommentsCasesSubFeature = ({
  apiTags,
  uiCapabilities,
  savedObjects,
}: CasesFeatureParams): SubFeatureConfig => ({
  name: i18n.translate(
    'securitySolutionPackages.features.featureRegistry.addCommentsSubFeatureName',
    { defaultMessage: 'Create comments & attachments' }
  ),
  privilegeGroups: [
    {
      groupType: 'independent',
      privileges: [
        {
          api: apiTags.default.createComment,
          id: 'create_comment',
          name: i18n.translate(
            'securitySolutionPackages.features.featureRegistry.addCommentsSubFeatureDetails',
            { defaultMessage: 'Add comments to cases' }
          ),
          includeIn: 'all',
          savedObject: {
            all: [...savedObjects.files],
            read: [...savedObjects.files],
          },
          cases: {
            createComment: [APP_ID],
          },
          ui: uiCapabilities.default.createComment,
        },
      ],
    },
  ],
});

export const getCasesReopenCaseSubFeature = ({
  uiCapabilities,
}: CasesFeatureParams): SubFeatureConfig => ({
  name: i18n.translate(
    'securitySolutionPackages.features.featureRegistry.reopenCaseSubFeatureName',
    { defaultMessage: 'Re-open' }
  ),
  privilegeGroups: [
    {
      groupType: 'independent',
      privileges: [
        {
          id: 'case_reopen',
          name: i18n.translate(
            'securitySolutionPackages.features.featureRegistry.reopenCaseSubFeatureDetails',
            { defaultMessage: 'Re-open closed cases' }
          ),
          includeIn: 'all',
          savedObject: {
            all: [],
            read: [],
          },
          cases: {
            reopenCase: [APP_ID],
          },
          ui: uiCapabilities.default.reopenCase,
        },
      ],
    },
  ],
});

export const getCasesAssignUsersCasesSubFeature = ({
  uiCapabilities,
}: CasesFeatureParams): SubFeatureConfig => ({
  name: i18n.translate('securitySolutionPackages.features.assignUsersSubFeatureName', {
    defaultMessage: 'Assign users',
  }),
  privilegeGroups: [
    {
      groupType: 'independent',
      privileges: [
        {
          id: 'cases_assign',
          name: i18n.translate('securitySolutionPackages.features.assignUsersSubFeatureName', {
            defaultMessage: 'Assign users to cases',
          }),
          includeIn: 'all',
          savedObject: {
            all: [],
            read: [],
          },
          cases: {
            assign: [APP_ID],
          },
          ui: uiCapabilities.default.assignCase,
        },
      ],
    },
  ],
});
