/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import type { AttachmentTypeDefinition } from '@kbn/agent-builder-server/attachments';

/**
 * Type id for the Nightshift "Agent brief" attachment.
 *
 * Kept in sync with the client-side constant of the same name
 * (`x-pack/solutions/observability/plugins/observability/public/pages/nightshift/agent_brief/nightshift_agent_brief_definition.tsx`)
 * — duplicated as a literal here so the server module doesn't need to
 * import any client code.
 */
export const NIGHTSHIFT_AGENT_BRIEF_TYPE = 'nightshift.agentBrief' as const;

/**
 * Allowed Nightshift modes. Mirrors `NightshiftStatus` on the client
 * — duplicated as a literal union so the server doesn't depend on the
 * client module.
 */
const nightshiftAgentBriefDataSchema = z.object({
  mode: z.enum(['loading', 'healthy', 'critical']),
});

export type NightshiftAgentBriefData = z.infer<typeof nightshiftAgentBriefDataSchema>;

/**
 * Server-side Nightshift "Agent brief" attachment type.
 *
 * The agent runtime never actually reads the brief data — the
 * attachment exists purely as a UI affordance pre-staged onto the user's
 * first message in a Nightshift-initiated conversation (see
 * `RoutedConversationsProvider` + `nightshift_agent_brief_definition.tsx`).
 *
 * Even so, the server still needs to know the type id so the
 * attachment passes validation when the conversation round is saved.
 * The validator is intentionally minimal — `{ mode: enum }` — because
 * the brief carries no other payload (the panel re-renders entirely
 * from the mode field on the client).
 */
export const nightshiftAgentBriefAttachmentType: AttachmentTypeDefinition<
  typeof NIGHTSHIFT_AGENT_BRIEF_TYPE,
  NightshiftAgentBriefData
> = {
  id: NIGHTSHIFT_AGENT_BRIEF_TYPE,

  validate: (input) => {
    const result = nightshiftAgentBriefDataSchema.safeParse(input);
    if (result.success) {
      return { valid: true, data: result.data };
    }
    return { valid: false, error: result.error.message };
  },

  /*
   * The brief has no agent-facing semantics — it's a UI snapshot only.
   * Return a description that nudges the LLM to treat it as context,
   * not as a tool target.
   */
  getAgentDescription: () =>
    'A Nightshift agent brief — a UI snapshot of the Nightshift overview page (loading / healthy / critical mode). Treat this as background context that the user is referencing; do not call tools against it.',

  format: (attachment) => ({
    getRepresentation: () => ({
      type: 'text',
      value: `Nightshift agent brief (mode: ${attachment.data.mode})`,
    }),
  }),

  getTools: () => [],
};
