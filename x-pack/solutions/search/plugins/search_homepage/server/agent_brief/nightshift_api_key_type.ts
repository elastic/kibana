/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import type { AttachmentTypeDefinition } from '@kbn/agent-builder-server/attachments';

/**
 * Type id for the VectorDB "Expiring API key" attachment.
 *
 * Kept in sync with the client-side constant in
 * `public/components/search_homepage/agent_brief/nightshift_api_key_constants.ts`.
 * Duplicated here as a literal so the server module doesn't need to
 * import client code (and pull EUI / React into the server bundle).
 */
export const NIGHTSHIFT_API_KEY_TYPE = 'nightshift.apiKey' as const;

/*
 * Permissive schema: the prototype's data is descriptive (name, scope,
 * expiry strings, rotation notes) and the server doesn't actually use
 * any of it — it just needs the payload to validate so the conversation
 * round can be saved. We do require an `id` + `name` so attachments
 * carry enough to identify themselves in logs / debugging, but every
 * other field is optional.
 */
const nightshiftApiKeyDataSchema = z.object({
  id: z.string(),
  name: z.string(),
  expiresIn: z.string().optional(),
  expiresAt: z.string().optional(),
  createdAt: z.string().optional(),
  accessRights: z.array(z.enum(['read', 'write'])).optional(),
  indexPatterns: z.array(z.string()).optional(),
  description: z.string().optional(),
  severity: z.enum(['critical', 'warning']).optional(),
  /*
   * The encoded API key value never reaches the agent — `format` below
   * intentionally omits it from the text representation passed to the
   * LLM. Validation accepts it so the attachment round-trips with the
   * payload the client staged.
   */
  value: z.string().optional(),
});

export type NightshiftApiKeyAttachmentData = z.infer<typeof nightshiftApiKeyDataSchema>;

/**
 * Server-side attachment type definition. The agent runtime does not
 * read this data — it's a UI affordance pre-staged on the conversation
 * when the user hands off from the homepage. The server only needs to:
 *  - know the type id (so `validateAttachment` doesn't reject it as
 *    "Unknown attachment type")
 *  - validate the payload shape
 *  - provide a one-line text representation for the LLM so the agent
 *    has enough context to act on the key (without exposing the
 *    actual `value`, which is a credential)
 */
export const nightshiftApiKeyAttachmentType: AttachmentTypeDefinition<
  typeof NIGHTSHIFT_API_KEY_TYPE,
  NightshiftApiKeyAttachmentData
> = {
  id: NIGHTSHIFT_API_KEY_TYPE,

  validate: (input) => {
    const result = nightshiftApiKeyDataSchema.safeParse(input);
    if (result.success) {
      return { valid: true, data: result.data };
    }
    return { valid: false, error: result.error.message };
  },

  getAgentDescription: () =>
    'A VectorDB API key nearing expiry handed off from the Search homepage. Each attachment represents one key the user wants the agent to rotate: pair the metadata (name, access rights, index patterns, expiry) with the user request to propose replacement-key parameters and walk the user through rotation. The raw API key `value` is intentionally not exposed to the agent — it stays on the user side only.',

  format: (attachment) => {
    const data = attachment.data;
    const scope = [
      data.accessRights?.length ? `access: ${data.accessRights.join(' + ')}` : undefined,
      data.indexPatterns?.length ? `indexes: ${data.indexPatterns.join(', ')}` : undefined,
      data.expiresIn ? `expires in: ${data.expiresIn}` : undefined,
      data.expiresAt ? `expires at: ${data.expiresAt}` : undefined,
      data.severity ? `severity: ${data.severity}` : undefined,
    ]
      .filter(Boolean)
      .join('; ');
    return {
      getRepresentation: () => ({
        type: 'text',
        value: `VectorDB expiring API key "${data.name}" (id: ${data.id}${scope ? `; ${scope}` : ''}).${
          data.description ? ` Notes: ${data.description}` : ''
        }`,
      }),
    };
  },

  getTools: () => [],
};
