/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AttachmentTypeDefinition } from '@kbn/agent-builder-server/attachments';
import type { Attachment } from '@kbn/agent-builder-common/attachments';
import { platformCoreTools } from '@kbn/agent-builder-common';
import { z } from '@kbn/zod/v4';
import { SecurityAgentBuilderAttachments } from '../../../common/constants';
import { SECURITY_CREATE_DETECTION_RULE_TOOL_ID, SECURITY_LABS_SEARCH_TOOL_ID } from '../tools';

import { securityAttachmentDataSchema } from './security_attachment_data_schema';

export const ruleAttachmentDataSchema = securityAttachmentDataSchema.extend({
  text: z.string(),
});

type RuleAttachmentData = z.infer<typeof ruleAttachmentDataSchema>;

/**
 * Type guard to narrow attachment data to RuleAttachmentData
 */
const isRuleAttachmentData = (data: unknown): data is RuleAttachmentData => {
  return ruleAttachmentDataSchema.safeParse(data).success;
};
export const createRuleAttachmentType = (): AttachmentTypeDefinition => {
  return {
    id: SecurityAgentBuilderAttachments.rule,
    validate: (input) => {
      const parseResult = ruleAttachmentDataSchema.safeParse(input);
      if (parseResult.success) {
        return { valid: true, data: parseResult.data };
      } else {
        return { valid: false, error: parseResult.error.message };
      }
    },
    format: (attachment: Attachment<string, unknown>) => {
      // Extract data to allow proper type narrowing
      const data = attachment.data;
      // Necessary because we cannot currently use the AttachmentType type as agent is not
      // registered with enum AttachmentType in agentBuilder attachment_types.ts
      if (!isRuleAttachmentData(data)) {
        throw new Error(`Invalid rule attachment data for attachment ${attachment.id}`);
      }
      return {
        getRepresentation: () => {
          return { type: 'text', value: formatRuleData(data) };
        },
      };
    },
    getTools: () => [
      platformCoreTools.generateEsql,
      platformCoreTools.productDocumentation,
      SECURITY_CREATE_DETECTION_RULE_TOOL_ID,
      SECURITY_LABS_SEARCH_TOOL_ID,
    ],
    getAgentDescription: () => {
      return `A security rule attachment. It may contain an existing rule, a migration rule, or an empty placeholder for a new rule.

The create_detection_rule tool automatically updates this attachment with the generated rule data. After calling create_detection_rule, use the attachmentId and version from the tool result to render the attachment inline using <render_attachment id="ATTACHMENT_ID" version="VERSION" /> so the user can see the generated rule fields. You MUST include the version attribute from the tool result. Do NOT call attachment_update or attachment_read for rule attachments — the tool handles this.

If this is a migration rule, it includes both the old rule and the new rule. Extract the query or topic from the rule attachment and use the appropriate tools to provide a response.`;
    },
  };
};

const formatRuleData = (data: RuleAttachmentData): string => {
  return data.text;
};
