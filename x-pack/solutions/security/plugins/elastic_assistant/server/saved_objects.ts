/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreSetup } from '@kbn/core/server';
import { promptType } from './lib/prompt/saved_object_mappings';

export const initSavedObjects = (savedObjects: CoreSetup['savedObjects']) => {
  try {
    savedObjects.registerType(promptType);
  } catch (e) {
    // implementation intends to fall back to reasonable defaults when the saved objects are unavailable
    // do not block the plugin from starting
  }
};
