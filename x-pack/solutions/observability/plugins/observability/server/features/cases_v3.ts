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
import { casesFeatureIdV3, casesFeatureId, observabilityFeatureId } from '../../common';

export const getCasesFeatureV3 = (
  casesCapabilities: CasesUiCapabilities,
  casesApiTags: CasesApiTags
): KibanaFeatureConfig => ({
  id: casesFeatureIdV3,
  name: i18n.translate('xpack.observability.featureRegistry.linkObservabilityTitle', {
    defaultMessage: 'Cases',
  }),
  order: 1100,
  category: DEFAULT_APP_CATEGORIES.observability,
  scope: [KibanaFeatureScope.Spaces, KibanaFeatureScope.Security],
  app: [casesFeatureId, 'kibana'],
  catalogue: [observabilityFeatureId],
  cases: [observabilityFeatureId],
  privileges: {
    all: {
      api: casesApiTags.all,
      app: [casesFeatureId, 'kibana'],
      catalogue: [observabilityFeatureId],
      cases: {
        create: [observabilityFeatureId],
        read: [observabilityFeatureId],
        update: [observabilityFeatureId],
        push: [observabilityFeatureId],
      },
      savedObject: {
        all: [...filesSavedObjectTypes],
        read: [...filesSavedObjectTypes],
      },
      ui: casesCapabilities.all,
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
            },
          ],
        },
      ],
    },
    {
      name: i18n.translate('xpack.observability.featureRegistry.addCommentsSubFeatureName', {
        defaultMessage: 'Create comments & attachments',
      }),
      privilegeGroups: [
        {
          groupType: 'independent',
          privileges: [
            {
              api: casesApiTags.createComment,
              id: 'create_comment',
              name: i18n.translate(
                'xpack.observability.featureRegistry.addCommentsSubFeatureDetails',
                {
                  defaultMessage: 'Add comments to cases',
                }
              ),
              includeIn: 'all',
              savedObject: {
                all: [...filesSavedObjectTypes],
                read: [...filesSavedObjectTypes],
              },
              cases: {
                createComment: [observabilityFeatureId],
              },
              ui: casesCapabilities.createComment,
            },
          ],
        },
      ],
    },
    {
      name: i18n.translate('xpack.observability.featureRegistry.reopenCaseSubFeatureName', {
        defaultMessage: 'Re-open',
      }),
      privilegeGroups: [
        {
          groupType: 'independent',
          privileges: [
            {
              id: 'case_reopen',
              name: i18n.translate(
                'xpack.observability.featureRegistry.reopenCaseSubFeatureDetails',
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
                reopenCase: [observabilityFeatureId],
              },
              ui: casesCapabilities.reopenCase,
            },
          ],
        },
      ],
    },
    {
      name: i18n.translate('xpack.observability.features.assignUsersSubFeatureName', {
        defaultMessage: 'Assign users',
      }),
      privilegeGroups: [
        {
          groupType: 'independent',
          privileges: [
            {
              id: 'cases_assign',
              name: i18n.translate('xpack.observability.features.assignUsersSubFeatureName', {
                defaultMessage: 'Assign users to cases',
              }),
              includeIn: 'all',
              savedObject: {
                all: [],
                read: [],
              },
              cases: {
                assign: [observabilityFeatureId],
              },
              ui: casesCapabilities.assignCase,
            },
          ],
        },
      ],
    },
  ],
});
