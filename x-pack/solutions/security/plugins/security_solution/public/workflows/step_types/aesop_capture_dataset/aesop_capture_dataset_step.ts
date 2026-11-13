/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { createPublicStepDefinition } from '@kbn/workflows-extensions/public';
import { aesopCaptureDatasetStepCommonDefinition } from '../../../../common/workflows/step_types/aesop_capture_dataset/aesop_capture_dataset_step_common';

export const aesopCaptureDatasetStepDefinition = createPublicStepDefinition({
  ...aesopCaptureDatasetStepCommonDefinition,
  icon: React.lazy(() =>
    import('@elastic/eui/es/components/icon/assets/app_security').then(({ icon }) => ({
      default: icon,
    }))
  ),
});
