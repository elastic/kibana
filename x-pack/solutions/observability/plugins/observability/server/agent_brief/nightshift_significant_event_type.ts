/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import type { AttachmentTypeDefinition } from '@kbn/agent-builder-server/attachments';

/**
 * Type id for the Nightshift significant-event attachment.
 *
 * Kept in sync with the client-side constant
 * (`public/pages/nightshift/agent_brief/nightshift_significant_event_definition.tsx`)
 * — duplicated as a literal here so the server module doesn't need to
 * import any client code.
 */
export const NIGHTSHIFT_SIGNIFICANT_EVENT_TYPE = 'nightshift.significantEvent' as const;

const nightshiftSignificantEventDataSchema = z.object({
  id: z.string(),
  title: z.string(),
  severity: z.enum(['critical', 'medium', 'low']),
});

export type NightshiftSignificantEventData = z.infer<typeof nightshiftSignificantEventDataSchema>;

/**
 * Server-side Nightshift significant-event attachment type.
 *
 * Like the Agent Brief, the agent runtime doesn't read this data —
 * it's a UI affordance pre-staged onto the conversation when the user
 * hands off from Critical state. The server only needs to know the
 * type id and a minimal data schema so the attachment passes
 * validation when the conversation round is saved.
 */
export const nightshiftSignificantEventAttachmentType: AttachmentTypeDefinition<
  typeof NIGHTSHIFT_SIGNIFICANT_EVENT_TYPE,
  NightshiftSignificantEventData
> = {
  id: NIGHTSHIFT_SIGNIFICANT_EVENT_TYPE,

  validate: (input) => {
    const result = nightshiftSignificantEventDataSchema.safeParse(input);
    if (result.success) {
      return { valid: true, data: result.data };
    }
    return { valid: false, error: result.error.message };
  },

  getAgentDescription: () =>
    'A Nightshift significant event — a single open incident handed off from the Nightshift Critical state. Treat each attachment as one event the user wants the agent to investigate, triage, or remediate. The `severity` field indicates urgency: `critical` > `medium` > `low`.',

  format: (attachment) => ({
    getRepresentation: () => ({
      type: 'text',
      value: `Nightshift significant event "${attachment.data.title}" (id: ${attachment.data.id}, severity: ${attachment.data.severity})`,
    }),
  }),

  getTools: () => [],
};
