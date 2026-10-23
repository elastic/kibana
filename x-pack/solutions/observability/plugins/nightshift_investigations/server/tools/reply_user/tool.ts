/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z, lazySchema } from '@kbn/zod/v4';
import { ToolType } from '@kbn/agent-builder-common';
import { ToolResultType } from '@kbn/agent-builder-common/tools/tool_result';
import type { BuiltinToolDefinition } from '@kbn/agent-builder-server';

export const REPLY_USER_TOOL_ID = 'reply_user';

const MAX_RESPONSE_LENGTH = 100_000;

const replyUserSchema = lazySchema(() =>
  z.object({
    response: z.string().max(MAX_RESPONSE_LENGTH),
  })
);

export const createReplyUserTool = (): BuiltinToolDefinition<typeof replyUserSchema> => ({
  id: REPLY_USER_TOOL_ID,
  type: ToolType.builtin,
  description: `Send the final investigation answer to the user.

Follow the system prompt's RESPONSE STYLE and INVESTIGATION ANSWER FORMAT rules: the answer must
carry the root cause, severity, impact, hypotheses with their status and confidence, key evidence
and next steps in plain markdown, because it is the only record of the investigation.
Do not use emojis in responses.

**GOOD:** "Root cause: the deploy at 01:00 UTC introduced a config
regression that doubled per-request DB latency."
**BAD:** "I ran several queries and found that the following..."`,
  tags: ['investigation'],
  schema: replyUserSchema,
  annotations: {
    title: 'Reply to user',
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: false,
  },
  excludeFromMcp: true,
  handler: async ({ response }) => ({
    results: [{ type: ToolResultType.other, data: { response } }],
  }),
});
