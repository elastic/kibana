/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import type { CommonTriggerDefinition } from '@kbn/workflows-extensions/common';

export const SECURITY_SETUP_COMPLETE_TRIGGER_ID = 'security.setupComplete' as const;

export const setupCompleteEventSchema = z.object({
  completed_cards: z
    .array(z.string())
    .describe('List of onboarding card IDs that were completed at the time of triggering.'),
});

export type SetupCompleteEvent = z.infer<typeof setupCompleteEventSchema>;

export const setupCompleteTriggerDefinition: CommonTriggerDefinition = {
  id: SECURITY_SETUP_COMPLETE_TRIGGER_ID,
  eventSchema: setupCompleteEventSchema,
};
