/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DEFAULT_APP_CATEGORIES } from '@kbn/core/server';
import type { FeaturesPluginSetup } from '@kbn/features-plugin/server';
import {
  WORKPLACE_AI_FEATURE_ID,
  WORKPLACE_AI_FEATURE_NAME,
  WORKPLACE_AI_APP_ID,
  capabilityGroups,
} from '../common/features';

export const registerFeatures = ({ features }: { features: FeaturesPluginSetup }) => {
  features.registerKibanaFeature({
    id: WORKPLACE_AI_FEATURE_ID,
    name: WORKPLACE_AI_FEATURE_NAME,
    minimumLicense: 'enterprise',
    order: 1000,
    category: DEFAULT_APP_CATEGORIES.workplaceAI,
    app: ['kibana', WORKPLACE_AI_APP_ID],
    catalogue: [WORKPLACE_AI_FEATURE_ID],
    privileges: {
      all: {
        app: ['kibana', WORKPLACE_AI_APP_ID],
        api: [...capabilityGroups.api.all],
        catalogue: [WORKPLACE_AI_FEATURE_ID],
        savedObject: {
          all: [],
          read: [],
        },
        ui: [...capabilityGroups.ui.all],
      },
      read: {
        app: ['kibana', WORKPLACE_AI_APP_ID],
        api: [...capabilityGroups.api.read],
        catalogue: [WORKPLACE_AI_FEATURE_ID],
        savedObject: {
          all: [],
          read: [],
        },
        ui: [...capabilityGroups.ui.read],
      },
    },
  });
};
