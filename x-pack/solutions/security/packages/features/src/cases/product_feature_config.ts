/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ProductFeatureCasesKey } from '../product_features_keys';
import { APP_ID } from '../constants';
import type { CasesFeatureParams, CasesProductFeaturesConfig } from './types';

export const getCasesProductFeaturesConfig = ({
  apiTags,
  uiCapabilities,
}: CasesFeatureParams): CasesProductFeaturesConfig => ({
  [ProductFeatureCasesKey.casesConnectors]: {
    privileges: {
      all: {
        api: apiTags.connectors.all,
        ui: uiCapabilities.connectors.all,
        cases: {
          push: [APP_ID],
        },
      },
      read: {
        api: apiTags.connectors.read,
        ui: uiCapabilities.connectors.read,
      },
    },
  },
});
