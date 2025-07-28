/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type {
  ProductFeatureKeys,
  NotesProductFeaturesConfigMap,
} from '@kbn/security-solution-features';
import {
  notesDefaultProductFeaturesConfig,
  createEnabledProductFeaturesConfigMap,
} from '@kbn/security-solution-features/config';
import { ProductFeatureNotesKey } from '@kbn/security-solution-features/keys';

export const getNotesProductFeaturesConfigurator =
  (enabledProductFeatureKeys: ProductFeatureKeys) => (): NotesProductFeaturesConfigMap =>
    createEnabledProductFeaturesConfigMap(
      ProductFeatureNotesKey,
      notesDefaultProductFeaturesConfig,
      enabledProductFeatureKeys
    );
