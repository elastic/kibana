/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

import { DEFAULT_APP_CATEGORIES } from '@kbn/core-application-common';
import {
  APP_ID,
  CLOUD_DEFEND_APP_ID,
  CLOUD_POSTURE_APP_ID,
  INITIALIZE_SECURITY_SOLUTION,
  LISTS_API_ALL,
  LISTS_API_READ,
  LISTS_API_SUMMARY,
  SECURITY_FEATURE_ID_V5,
  SECURITY_UI_CRUD,
  SECURITY_UI_SHOW,
  USERS_API_READ,
} from '../../constants';
import type { BaseKibanaFeatureConfig } from '../../types';
import type { SecurityFeatureParams } from '../types';

export const getSecurityV5BaseKibanaFeature = ({
  savedObjects,
}: SecurityFeatureParams): BaseKibanaFeatureConfig => ({
  id: SECURITY_FEATURE_ID_V5,
  name: i18n.translate(
    'securitySolutionPackages.features.featureRegistry.linkSecuritySolutionTitle',
    {
      defaultMessage: 'Security',
    }
  ),
  order: 1100,
  category: DEFAULT_APP_CATEGORIES.security,
  app: [APP_ID, CLOUD_POSTURE_APP_ID, CLOUD_DEFEND_APP_ID, 'kibana'],
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
      app: [APP_ID, CLOUD_POSTURE_APP_ID, CLOUD_DEFEND_APP_ID, 'kibana'],
      catalogue: [APP_ID],
      api: [
        APP_ID,
        'rac',
        LISTS_API_ALL,
        LISTS_API_READ,
        LISTS_API_SUMMARY,
        USERS_API_READ,
        INITIALIZE_SECURITY_SOLUTION,
      ],
      savedObject: {
        all: ['alert', ...savedObjects],
        read: [],
      },
      ui: [SECURITY_UI_SHOW, SECURITY_UI_CRUD],
    },
    read: {
      app: [APP_ID, CLOUD_POSTURE_APP_ID, CLOUD_DEFEND_APP_ID, 'kibana'],
      catalogue: [APP_ID],
      api: [APP_ID, 'rac', LISTS_API_READ, USERS_API_READ, INITIALIZE_SECURITY_SOLUTION],
      savedObject: {
        all: [],
        read: [...savedObjects],
      },
      ui: [SECURITY_UI_SHOW],
    },
  },
});
