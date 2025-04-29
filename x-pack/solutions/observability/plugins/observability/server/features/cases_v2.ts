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
import {
  casesFeatureIdV2,
  casesFeatureId,
  observabilityFeatureId,
  casesFeatureIdV3,
} from '../../common';

export const getCasesFeatureV2 = (
  casesCapabilities: CasesUiCapabilities,
  casesApiTags: CasesApiTags
): KibanaFeatureConfig => ({
  deprecated: {
    notice: i18n.translate('xpack.observability.featureRegistry.casesFeature.deprecationMessage', {
      defaultMessage: 'The {currentId} permissions are deprecated, please see {casesFeatureIdV3}.',
      values: {
        currentId: casesFeatureIdV2,
        casesFeatureIdV3,
      },
    }),
  },
  id: casesFeatureIdV2,
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
        assign: [observabilityFeatureId],
      },
      savedObject: {
        all: [...filesSavedObjectTypes],
        read: [...filesSavedObjectTypes],
      },
      ui: [...casesCapabilities.all, ...casesCapabilities.assignCase],
      replacedBy: {
        default: [{ feature: casesFeatureIdV3, privileges: ['all'] }],
        minimal: [
          {
            feature: casesFeatureIdV3,
            privileges: ['minimal_all', 'cases_assign'],
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
              replacedBy: [{ feature: casesFeatureIdV3, privileges: ['create_comment'] }],
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
              replacedBy: [{ feature: casesFeatureIdV3, privileges: ['case_reopen'] }],
            },
          ],
        },
      ],
    },
  ],
});
