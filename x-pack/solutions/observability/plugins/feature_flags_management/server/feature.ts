/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DEFAULT_APP_CATEGORIES } from '@kbn/core/server';
import type { FeaturesPluginSetup } from '@kbn/features-plugin/server';
import { i18n } from '@kbn/i18n';
import { API_PRIVILEGES, APP_ID, FEATURE_ID, UI_CAPABILITIES } from '../common/constants';

export const registerFeature = (features: FeaturesPluginSetup): void => {
  features.registerKibanaFeature({
    id: FEATURE_ID,
    name: i18n.translate('xpack.featureFlagsManagement.featureRegistry.featureName', {
      defaultMessage: 'Feature flags',
    }),
    privilegesTooltip: i18n.translate(
      'xpack.featureFlagsManagement.featureRegistry.privilegesTooltip',
      {
        defaultMessage:
          'Feature flags, apps, environments and credentials are shared across all spaces.',
      }
    ),
    category: DEFAULT_APP_CATEGORIES.management,
    app: [APP_ID],
    privileges: {
      all: {
        app: [APP_ID],
        api: [API_PRIVILEGES.manage, API_PRIVILEGES.read],
        ui: [UI_CAPABILITIES.show, UI_CAPABILITIES.save],
        savedObject: { all: [], read: [] },
      },
      read: {
        app: [APP_ID],
        api: [API_PRIVILEGES.read],
        ui: [UI_CAPABILITIES.show],
        savedObject: { all: [], read: [] },
      },
    },
  });
};
