/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { StepCategory } from '@kbn/workflows';
import { createPublicStepDefinition } from '@kbn/workflows-extensions/public';
import {
  resolveWrittenDetectionsInputSchema,
  resolveWrittenDetectionsOutputSchema,
} from '../../../common/workflows/steps/resolve_written_detections';

export const resolveWrittenDetectionsPublicStepDefinition = createPublicStepDefinition({
  id: 'significantEvents.resolveWrittenDetections',
  label: i18n.translate('xpack.significantEvents.workflows.resolveWrittenDetectionsStepLabel', {
    defaultMessage: 'Resolve discovery detections written by this run',
  }),
  category: StepCategory.Elasticsearch,
  description: i18n.translate(
    'xpack.significantEvents.workflows.resolveWrittenDetectionsStepDescription',
    {
      defaultMessage:
        'Finds the batch detections recorded in events written by this discovery execution, then combines them with the agent-reported rules that have no event.',
    }
  ),
  inputSchema: resolveWrittenDetectionsInputSchema,
  outputSchema: resolveWrittenDetectionsOutputSchema,
});
