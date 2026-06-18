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
  text: z.string().max(500_000),
  attachmentLabel: z.string().max(1_000).optional(),
  // Save signal: `null` while unsaved (create), the saved id once saved (update). Nullable so the
  // tool can emit an explicit `null` for a not-yet-saved rule rather than omitting the field.
  ruleId: z.string().max(500).nullable().optional(),
});

const DETECTION_RULE_SKILL_NAME_ID = 'detection-rule-edit';

type RuleAttachmentData = z.infer<typeof ruleAttachmentDataSchema>;

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
      const data = attachment.data;
      // AttachmentType enum is not yet registered for security attachments, so we validate manually.
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
      const description = `You have access to a security detection rule stored as stringified JSON in the "text" field. It may be an existing rule or an empty placeholder for a new rule.

SECURITY RULE DATA:
{ruleData}

---
Complete in order:

1. When asked to modify, update, or create a detection rule, ALWAYS read the ${DETECTION_RULE_SKILL_NAME_ID} skill from the skills/security/rules directory.
2. Use the available tools to research, create, or edit the rule and provide a response.`;
      return description;
    },
  };
};

const formatRuleData = (data: RuleAttachmentData): string => {
  return data.text;
};
