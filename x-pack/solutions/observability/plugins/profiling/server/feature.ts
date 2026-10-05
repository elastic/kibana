/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { DEFAULT_APP_CATEGORIES } from '@kbn/core/server';

export const PROFILING_SERVER_FEATURE_ID = 'profiling';

// The API privilege the feature grants and every profiling route requires. It reuses the feature ID
// as its value, but has its own name because it's a separate concept: route authorization checks
// this privilege, not the feature ID, and the two could diverge in the future.
export const PROFILING_API_PRIVILEGE = PROFILING_SERVER_FEATURE_ID;

export const PROFILING_FEATURE = {
  id: PROFILING_SERVER_FEATURE_ID,
  name: i18n.translate('xpack.profiling.featureRegistry.profilingFeatureName', {
    defaultMessage: 'Universal Profiling',
  }),
  order: 1200,
  category: DEFAULT_APP_CATEGORIES.observability,
  app: [PROFILING_SERVER_FEATURE_ID, 'ux', 'kibana'],
  // see x-pack/platform/plugins/shared/features/common/feature_kibana_privileges.ts
  privileges: {
    all: {
      app: [PROFILING_SERVER_FEATURE_ID, 'ux', 'kibana'],
      savedObject: {
        all: [],
        read: [],
      },
      ui: ['show'],
      api: [PROFILING_API_PRIVILEGE],
    },
    read: {
      app: [PROFILING_SERVER_FEATURE_ID, 'ux', 'kibana'],
      savedObject: {
        all: [],
        read: [],
      },
      ui: ['show'],
      api: [PROFILING_API_PRIVILEGE],
    },
  },
};
