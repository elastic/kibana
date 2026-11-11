/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { StepCategory } from '@kbn/workflows';
import type { CommonStepDefinition } from '@kbn/workflows-extensions/common';
import { z, lazySchema } from '@kbn/zod/v4';
import { ENDPOINT_EVENT_INDICES_MAX_LENGTH } from '../endpoint_event_indices';

export const ENDPOINT_EVENT_INDEX_STEP_ID = 'alertzero.attackDiscovery.endpointEventIndex' as const;

const inputSchema = lazySchema(() => z.object({}));

const outputSchema = lazySchema(() =>
  z.object({
    index: z
      .string()
      .min(1)
      .max(ENDPOINT_EVENT_INDICES_MAX_LENGTH)
      .describe(
        'Comma-separated logs-endpoint.events.* target, local plus one pattern per remote cluster alias.'
      ),
  })
);

export const endpointEventIndexStepCommonDefinition: CommonStepDefinition<
  typeof inputSchema,
  typeof outputSchema
> = {
  id: ENDPOINT_EVENT_INDEX_STEP_ID,
  label: i18n.translate('xpack.alertzero.workflows.steps.endpointEventIndex.label', {
    defaultMessage: 'Resolve endpoint event index',
  }),
  description: i18n.translate('xpack.alertzero.workflows.steps.endpointEventIndex.description', {
    defaultMessage:
      "Builds the Elastic Defend event index for this space, including each remote cluster named by the space's Security default data view.",
  }),
  category: StepCategory.KibanaSecurity,
  stability: 'tech_preview',
  inputSchema,
  outputSchema,
};
