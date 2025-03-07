/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DEFAULT_APP_CATEGORIES } from '@kbn/core-application-common';
import { i18n } from '@kbn/i18n';
import { KibanaFeatureScope } from '@kbn/features-plugin/common';

import { APP_ID, SIEM_MIGRATIONS_FEATURE_ID } from '../constants';
import { type BaseKibanaFeatureConfig } from '../types';

export const getSiemMigrationsBaseKibanaFeature = (): BaseKibanaFeatureConfig => ({
  id: SIEM_MIGRATIONS_FEATURE_ID,
  name: i18n.translate(
    'securitySolutionPackages.features.featureRegistry.linkSecuritySolutionSiemMigrationsTitle',
    {
      defaultMessage: 'SIEM migrations',
    }
  ),
  order: 1500,
  category: DEFAULT_APP_CATEGORIES.security,
  scope: [KibanaFeatureScope.Spaces, KibanaFeatureScope.Security],
  app: [SIEM_MIGRATIONS_FEATURE_ID, 'kibana'],
  catalogue: [APP_ID],
  minimumLicense: 'enterprise',
  privileges: {
    all: {
      api: [],
      app: [SIEM_MIGRATIONS_FEATURE_ID, 'kibana'],
      catalogue: [APP_ID],
      savedObject: {
        all: [],
        read: [],
      },
      ui: [],
    },
    read: {
      // No read-only mode currently supported
      disabled: true,
      savedObject: {
        all: [],
        read: [],
      },
      ui: [],
    },
  },
});
