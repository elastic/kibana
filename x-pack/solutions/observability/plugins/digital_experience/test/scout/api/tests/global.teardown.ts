/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { globalTeardownHook } from '@kbn/scout-oblt';
import { FLAG_RESET_OVERRIDE } from '../../feature_flag';
import { DIGITAL_EXPERIENCE_DISABLED_TAGS } from '../../tags';

globalTeardownHook(
  'Restore the Digital Experience feature flag',
  { tag: DIGITAL_EXPERIENCE_DISABLED_TAGS },
  async ({ apiServices }) => {
    await apiServices.core.settings(FLAG_RESET_OVERRIDE);
  }
);
