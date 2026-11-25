/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { createPublicStepDefinition } from '@kbn/workflows-extensions/public';
import {
  triageJevFirstLineStepCommonDefinition,
  triageMatchVerdictCacheStepCommonDefinition,
  triageWriteVerdictCacheStepCommonDefinition,
} from '../../common/step_types/alert_triage';

export const triageWriteVerdictCachePublicStepDefinition = createPublicStepDefinition({
  ...triageWriteVerdictCacheStepCommonDefinition,
  icon: React.lazy(() =>
    import('@elastic/eui/es/components/icon/assets/database').then(({ icon }) => ({
      default: icon,
    }))
  ),
});

export const triageMatchVerdictCachePublicStepDefinition = createPublicStepDefinition({
  ...triageMatchVerdictCacheStepCommonDefinition,
  icon: React.lazy(() =>
    import('@elastic/eui/es/components/icon/assets/merge').then(({ icon }) => ({ default: icon }))
  ),
});

export const triageJevFirstLinePublicStepDefinition = createPublicStepDefinition({
  ...triageJevFirstLineStepCommonDefinition,
  icon: React.lazy(() =>
    import('@elastic/eui/es/components/icon/assets/sparkles').then(({ icon }) => ({
      default: icon,
    }))
  ),
});
