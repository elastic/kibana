/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AttachmentTypeDefinition } from '@kbn/agent-builder-server/attachments';
import type { Attachment } from '@kbn/agent-builder-common/attachments';
import { z, lazySchema } from '@kbn/zod/v4';
import { SecurityAgentBuilderAttachments } from '../../../common/constants';
import { securityAttachmentDataSchema } from './security_attachment_data_schema';

/** A rule set that the agent suggests. The user creates it from the card; the agent never does. */
export const ruleSetAttachmentDataSchema = lazySchema(() =>
  securityAttachmentDataSchema.extend({
    name: z.string(),
    reason: z.string(),
    conditions: z.object({
      tags: z.array(z.string()).optional(),
      integrations: z.array(z.string()).optional(),
      rule_types: z.array(z.string()).optional(),
      severities: z.array(z.string()).optional(),
      source: z.enum(['elastic', 'custom']).optional(),
      search: z.string().optional(),
    }),
    rules_count: z.number(),
    existing_rule_set: z.object({ id: z.string(), name: z.string() }).optional(),
  })
);

export type RuleSetAttachmentData = z.infer<typeof ruleSetAttachmentDataSchema>;

export const createRuleSetAttachmentType = (): AttachmentTypeDefinition => ({
  id: SecurityAgentBuilderAttachments.ruleSet,
  validate: (input) => {
    const parsed = ruleSetAttachmentDataSchema.safeParse(input);
    return parsed.success
      ? { valid: true, data: parsed.data }
      : { valid: false, error: parsed.error.message };
  },
  format: (attachment: Attachment<string, unknown>) => {
    const parsed = ruleSetAttachmentDataSchema.safeParse(attachment.data);
    if (!parsed.success) {
      throw new Error(`Invalid rule set attachment data for attachment ${attachment.id}`);
    }
    const {
      name,
      reason,
      conditions,
      rules_count: rulesCount,
      existing_rule_set: existing,
    } = parsed.data;
    return {
      getRepresentation: () => ({
        type: 'text',
        value: [
          `Suggested rule set "${name}" (${rulesCount} rules).`,
          `Reason: ${reason}`,
          `Conditions: ${JSON.stringify(conditions)}`,
          existing ? `A rule set with the same conditions already exists: "${existing.name}".` : '',
        ]
          .filter(Boolean)
          .join('\n'),
      }),
    };
  },
});
