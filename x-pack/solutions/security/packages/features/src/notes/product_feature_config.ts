/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ProductFeatureNotesKey } from '../product_features_keys';
import type { ProductFeaturesConfig } from '../types';

export const notesProductFeaturesConfig: ProductFeaturesConfig<ProductFeatureNotesKey> = {
  [ProductFeatureNotesKey.notes]: {
    privileges: {
      all: {
        api: ['notes_read', 'notes_write'],
        ui: ['read', 'crud'],
      },
      read: {
        api: ['notes_read'],
        ui: ['read'],
      },
    },
  },
};
