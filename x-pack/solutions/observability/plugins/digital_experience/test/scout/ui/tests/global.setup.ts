/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { globalSetupHook } from '@kbn/scout-oblt';
import { FLAG_OFF_OVERRIDE } from '../../feature_flag';
import { DIGITAL_EXPERIENCE_DISABLED_TAGS } from '../../tags';

// These specs also run on Cloud, where a rollout rule could turn the flag on for the deployment.
globalSetupHook(
  'Turn the Digital Experience feature flag off',
  { tag: DIGITAL_EXPERIENCE_DISABLED_TAGS },
  async ({ apiServices }) => {
    await apiServices.core.settings(FLAG_OFF_OVERRIDE);
  }
);
