/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { createPublicStepDefinition } from '@kbn/workflows-extensions/public';
import {
  triageMatchFpDecisionsStepCommonDefinition,
  triageRevokeFpDecisionStepCommonDefinition,
  triageStoreFpDecisionsStepCommonDefinition,
} from '../../common/step_types/alert_triage';

export const triageStoreFpDecisionsPublicStepDefinition = createPublicStepDefinition({
  ...triageStoreFpDecisionsStepCommonDefinition,
  icon: React.lazy(() =>
    import('@elastic/eui/es/components/icon/assets/save').then(({ icon }) => ({ default: icon }))
  ),
});

export const triageMatchFpDecisionsPublicStepDefinition = createPublicStepDefinition({
  ...triageMatchFpDecisionsStepCommonDefinition,
  icon: React.lazy(() =>
    import('@elastic/eui/es/components/icon/assets/filter').then(({ icon }) => ({ default: icon }))
  ),
});

export const triageRevokeFpDecisionPublicStepDefinition = createPublicStepDefinition({
  ...triageRevokeFpDecisionStepCommonDefinition,
  icon: React.lazy(() =>
    import('@elastic/eui/es/components/icon/assets/undo').then(({ icon }) => ({ default: icon }))
  ),
});
