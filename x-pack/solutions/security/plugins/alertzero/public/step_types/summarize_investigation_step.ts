/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createPublicStepDefinition } from '@kbn/workflows-extensions/public';
import { summarizeInvestigationStepCommonDefinition } from '../../common/step_types/summarize_investigation';
import { AlertZeroStepIcon } from './alertzero_step_icon';

export const summarizeInvestigationPublicStepDefinition = createPublicStepDefinition({
  ...summarizeInvestigationStepCommonDefinition,
  icon: AlertZeroStepIcon,
});
