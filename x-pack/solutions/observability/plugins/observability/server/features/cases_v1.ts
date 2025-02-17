/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DEFAULT_APP_CATEGORIES } from '@kbn/core/server';
import { hiddenTypes as filesSavedObjectTypes } from '@kbn/files-plugin/server/saved_objects';
import { i18n } from '@kbn/i18n';
import { KibanaFeatureConfig, KibanaFeatureScope } from '@kbn/features-plugin/common';
import { CasesUiCapabilities, CasesApiTags } from '@kbn/cases-plugin/common';
import { casesFeatureId, casesFeatureIdV3, observabilityFeatureId } from '../../common';

export const getCasesFeature = (
  casesCapabilities: CasesUiCapabilities,
  casesApiTags: CasesApiTags
): KibanaFeatureConfig => ({
  deprecated: {
    // TODO: Add docLinks to link to documentation about the deprecation
    notice: i18n.translate(
      'xpack.observability.featureRegistry.linkObservabilityTitle.deprecationMessage',
      {
        defaultMessage:
          'The {currentId} permissions are deprecated, please see {casesFeatureIdV3}.',
        values: {
          currentId: casesFeatureId,
          casesFeatureIdV3,
        },
      }
    ),
  },
  id: casesFeatureId,
  name: i18n.translate('xpack.observability.featureRegistry.linkObservabilityTitleDeprecated', {
    defaultMessage: 'Cases (Deprecated)',
  }),
  order: 1100,
  category: DEFAULT_APP_CATEGORIES.observability,
  scope: [KibanaFeatureScope.Spaces, KibanaFeatureScope.Security],
  app: [casesFeatureId, 'kibana'],
  catalogue: [observabilityFeatureId],
  cases: [observabilityFeatureId],
  privileges: {
    all: {
      api: [...casesApiTags.all, ...casesApiTags.createComment],
      app: [casesFeatureId, 'kibana'],
      catalogue: [observabilityFeatureId],
      cases: {
        create: [observabilityFeatureId],
        read: [observabilityFeatureId],
        update: [observabilityFeatureId],
        push: [observabilityFeatureId],
        createComment: [observabilityFeatureId],
        reopenCase: [observabilityFeatureId],
        assign: [observabilityFeatureId],
      },
      savedObject: {
        all: [...filesSavedObjectTypes],
        read: [...filesSavedObjectTypes],
      },
      ui: [
        ...casesCapabilities.all,
        ...casesCapabilities.createComment,
        ...casesCapabilities.reopenCase,
        ...casesCapabilities.assignCase,
      ],
      replacedBy: {
        default: [{ feature: casesFeatureIdV3, privileges: ['all'] }],
        minimal: [
          {
            feature: casesFeatureIdV3,
            privileges: ['minimal_all', 'create_comment', 'case_reopen', 'cases_assign'],
          },
        ],
      },
    },
    read: {
      api: casesApiTags.read,
      app: [casesFeatureId, 'kibana'],
      catalogue: [observabilityFeatureId],
      cases: {
        read: [observabilityFeatureId],
      },
      savedObject: {
        all: [],
        read: [...filesSavedObjectTypes],
      },
      ui: casesCapabilities.read,
      replacedBy: {
        default: [{ feature: casesFeatureIdV3, privileges: ['read'] }],
        minimal: [{ feature: casesFeatureIdV3, privileges: ['minimal_read'] }],
      },
    },
  },
  subFeatures: [
    {
      name: i18n.translate('xpack.observability.featureRegistry.deleteSubFeatureName', {
        defaultMessage: 'Delete',
      }),
      privilegeGroups: [
        {
          groupType: 'independent',
          privileges: [
            {
              api: casesApiTags.delete,
              id: 'cases_delete',
              name: i18n.translate('xpack.observability.featureRegistry.deleteSubFeatureDetails', {
                defaultMessage: 'Delete cases and comments',
              }),
              includeIn: 'all',
              savedObject: {
                all: [...filesSavedObjectTypes],
                read: [...filesSavedObjectTypes],
              },
              cases: {
                delete: [observabilityFeatureId],
              },
              ui: casesCapabilities.delete,
              replacedBy: [{ feature: casesFeatureIdV3, privileges: ['cases_delete'] }],
            },
          ],
        },
      ],
    },
    {
      name: i18n.translate('xpack.observability.featureRegistry.casesSettingsSubFeatureName', {
        defaultMessage: 'Case settings',
      }),
      privilegeGroups: [
        {
          groupType: 'independent',
          privileges: [
            {
              id: 'cases_settings',
              name: i18n.translate(
                'xpack.observability.featureRegistry.casesSettingsSubFeatureDetails',
                {
                  defaultMessage: 'Edit case settings',
                }
              ),
              includeIn: 'all',
              savedObject: {
                all: [...filesSavedObjectTypes],
                read: [...filesSavedObjectTypes],
              },
              cases: {
                settings: [observabilityFeatureId],
              },
              ui: casesCapabilities.settings,
              replacedBy: [{ feature: casesFeatureIdV3, privileges: ['cases_settings'] }],
            },
          ],
        },
      ],
    },
  ],
});
