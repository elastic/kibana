/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { StepCategory } from '@kbn/workflows';
import { createPublicStepDefinition } from '@kbn/workflows-extensions/public';
import { lazySchema, z } from '@kbn/zod/v4';
import { MAX_ID_LENGTH } from '@kbn/significant-events-schema';
import { batchEntrySchema } from '../../../common/workflows/steps/detection_batch';

const MAX_BATCH_ENTRIES = 1_000;

const inputSchema = lazySchema(() =>
  z.object({
    workflow_execution_id: z.string().max(MAX_ID_LENGTH),
    batch: z.array(batchEntrySchema).max(MAX_BATCH_ENTRIES),
    reported_rule_uuids: z.array(z.string().max(MAX_ID_LENGTH)).max(MAX_BATCH_ENTRIES),
  })
);

const outputSchema = lazySchema(() =>
  z.object({
    stamp_rule_uuids: z.array(z.string().max(MAX_ID_LENGTH)).max(MAX_BATCH_ENTRIES),
    derived_count: z.number().int().min(0).max(MAX_BATCH_ENTRIES),
    unknown_reported_count: z.number().int().min(0).max(MAX_BATCH_ENTRIES),
  })
);

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
  inputSchema,
  outputSchema,
});
