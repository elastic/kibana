/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import type { AttachmentTypeDefinition } from '@kbn/agent-builder-server/attachments';

/**
 * Type id for the "Create API key" attachment.
 *
 * Mirrors the client-side constant in
 * `public/components/search_homepage/agent_brief/nightshift_create_api_key_constants.ts`.
 * Duplicated as a literal here so the server module doesn't need to
 * import client code (no EUI / React on the server).
 */
export const NIGHTSHIFT_CREATE_API_KEY_TYPE = 'nightshift.createApiKey' as const;

const nightshiftCreateApiKeyDataSchema = z.object({
  id: z.string(),
  defaultName: z.string().optional(),
  scopeHint: z.string().optional(),
});

export type NightshiftCreateApiKeyAttachmentData = z.infer<
  typeof nightshiftCreateApiKeyDataSchema
>;

/**
 * Server-side attachment type for the "Create API key" affordance.
 *
 * The created key's encoded value never reaches the server-side
 * attachment data — the client-side store keeps it for the duration
 * of the conversation only. The agent's representation is therefore
 * just a "blank ticket" descriptor: the agent knows the user has been
 * offered the ability to create a key with a particular name / scope,
 * but never sees the resulting secret.
 */
export const nightshiftCreateApiKeyAttachmentType: AttachmentTypeDefinition<
  typeof NIGHTSHIFT_CREATE_API_KEY_TYPE,
  NightshiftCreateApiKeyAttachmentData
> = {
  id: NIGHTSHIFT_CREATE_API_KEY_TYPE,

  validate: (input) => {
    const result = nightshiftCreateApiKeyDataSchema.safeParse(input);
    if (result.success) {
      return { valid: true, data: result.data };
    }
    return { valid: false, error: result.error.message };
  },

  getAgentDescription: () =>
    'A "Create API key" affordance attached to the conversation. The user can open it to create a new API key via the Kibana API key flyout; the encoded key value is held client-side only and is never exposed to the agent. Treat this attachment as an actionable widget the user can fill in, not as a credential.',

  format: (attachment) => {
    const data = attachment.data;
    const name = data.defaultName ? `name: "${data.defaultName}"` : 'name: (user-provided)';
    const scope = data.scopeHint ? `; scope: ${data.scopeHint}` : '';
    return {
      getRepresentation: () => ({
        type: 'text',
        value: `Create API key ticket (${name}${scope}). The user will fill in the flyout from the conversation; the encoded value is not shared with the agent.`,
      }),
    };
  },

  getTools: () => [],
};
