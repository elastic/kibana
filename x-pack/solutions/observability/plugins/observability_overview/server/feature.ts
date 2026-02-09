/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { DEFAULT_APP_CATEGORIES } from '@kbn/core/server';
import type { KibanaFeatureConfig } from '@kbn/features-plugin/common';

export const OBSERVABILITY_OVERVIEW_FEATURE_ID = 'observabilityOverview';

export const OBSERVABILITY_OVERVIEW_FEATURE: KibanaFeatureConfig = {
  id: OBSERVABILITY_OVERVIEW_FEATURE_ID,
  name: i18n.translate('xpack.observabilityOverview.featureRegistry.featureName', {
    defaultMessage: 'Observability Overview',
  }),
  order: 8000,
  category: DEFAULT_APP_CATEGORIES.observability,
  app: [OBSERVABILITY_OVERVIEW_FEATURE_ID, 'kibana'],
  catalogue: ['observability'],
  privileges: {
    all: {
      app: [OBSERVABILITY_OVERVIEW_FEATURE_ID, 'kibana'],
      catalogue: ['observability'],
      savedObject: {
        all: [],
        read: [],
      },
      ui: ['show'],
    },
    read: {
      app: [OBSERVABILITY_OVERVIEW_FEATURE_ID, 'kibana'],
      catalogue: ['observability'],
      savedObject: {
        all: [],
        read: [],
      },
      ui: ['show'],
    },
  },
};
