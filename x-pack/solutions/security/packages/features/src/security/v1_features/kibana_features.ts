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
  APP_ID,
  SERVER_APP_ID,
  CLOUD_POSTURE_APP_ID,
  SECURITY_FEATURE_ID_V2,
  TIMELINE_FEATURE_ID,
  NOTES_FEATURE_ID,
} from '../../constants';
import type { SecurityFeatureParams } from '../types';
import type { BaseKibanaFeatureConfig } from '../../types';

export const getSecurityBaseKibanaFeature = ({
  savedObjects,
}: SecurityFeatureParams): BaseKibanaFeatureConfig => ({
  deprecated: {
    notice: i18n.translate(
      'securitySolutionPackages.features.featureRegistry.linkSecuritySolutionSecurity.deprecationMessage',
      {
        defaultMessage: 'The {currentId} permissions are deprecated, please see {idV2}.',
        values: {
          currentId: SERVER_APP_ID,
          idV2: SECURITY_FEATURE_ID_V2,
        },
      }
    ),
  },

  id: SERVER_APP_ID,
  name: i18n.translate(
    'securitySolutionPackages.features.featureRegistry.linkSecuritySolutionTitleDeprecated',
    {
      defaultMessage: 'Security (Deprecated)',
    }
  ),
  order: 1100,
  category: DEFAULT_APP_CATEGORIES.security,
  scope: [KibanaFeatureScope.Spaces, KibanaFeatureScope.Security],
  app: [APP_ID, CLOUD_POSTURE_APP_ID, 'kibana'],
  catalogue: [APP_ID],
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
          { feature: TIMELINE_FEATURE_ID, privileges: ['all'] },
          { feature: NOTES_FEATURE_ID, privileges: ['all'] },
          { feature: SECURITY_FEATURE_ID_V2, privileges: ['all'] },
        ],
        minimal: [
          { feature: TIMELINE_FEATURE_ID, privileges: ['all'] },
          { feature: NOTES_FEATURE_ID, privileges: ['all'] },
          { feature: SECURITY_FEATURE_ID_V2, privileges: ['minimal_all'] },
        ],
      },
      app: [APP_ID, CLOUD_POSTURE_APP_ID, 'kibana'],
      catalogue: [APP_ID],
      api: [
        APP_ID,
        'lists-all',
        'lists-read',
        'lists-summary',
        'rac',
        'cloud-security-posture-all',
        'cloud-security-posture-read',
        'cloud-defend-all',
        'cloud-defend-read',
        'timeline_write',
        'timeline_read',
        'notes_write',
        'notes_read',
        'bulkGetUserProfiles',
      ],
      savedObject: {
        all: ['alert', ...savedObjects],
        read: [],
      },
      ui: ['show', 'crud'],
    },
    read: {
      replacedBy: {
        default: [
          { feature: TIMELINE_FEATURE_ID, privileges: ['read'] },
          { feature: NOTES_FEATURE_ID, privileges: ['read'] },
          { feature: SECURITY_FEATURE_ID_V2, privileges: ['read'] },
        ],
        minimal: [
          { feature: TIMELINE_FEATURE_ID, privileges: ['read'] },
          { feature: NOTES_FEATURE_ID, privileges: ['read'] },
          { feature: SECURITY_FEATURE_ID_V2, privileges: ['minimal_read'] },
        ],
      },
      app: [APP_ID, CLOUD_POSTURE_APP_ID, 'kibana'],
      catalogue: [APP_ID],
      api: [
        APP_ID,
        'lists-read',
        'rac',
        'cloud-security-posture-read',
        'cloud-defend-read',
        'timeline_read',
        'notes_read',
        'bulkGetUserProfiles',
      ],
      savedObject: {
        all: [],
        read: [...savedObjects],
      },
      ui: ['show'],
    },
  },
});
