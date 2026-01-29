/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AttachmentTypeDefinition } from '@kbn/agent-builder-server/attachments';
import type { Attachment } from '@kbn/agent-builder-common/attachments';
import { platformCoreTools } from '@kbn/agent-builder-common';
import { z } from '@kbn/zod';
import { SecurityAgentBuilderAttachments } from '../../../common/constants';
import { securityAttachmentDataSchema } from './security_attachment_data_schema';

export const ruleAttachmentDataSchema = securityAttachmentDataSchema.extend({
  /**
   * Rule text representation (legacy format).
   */
  text: z.string().optional(),
  /**
   * Rule ID.
   */
  ruleId: z.string().optional(),
  /**
   * Rule name.
   */
  ruleName: z.string().optional(),
  /**
   * Rule description.
   */
  ruleDescription: z.string().optional(),
  /**
   * Whether the rule is enabled.
   */
  enabled: z.boolean().optional(),
  /**
   * Rule severity.
   */
  severity: z.string().optional(),
  /**
   * Rule query (KQL or EQL).
   */
  query: z.string().optional(),
  /**
   * Rule type.
   */
  ruleType: z.string().optional(),
});

type RuleAttachmentData = z.infer<typeof ruleAttachmentDataSchema>;

/**
 * Type guard to narrow attachment data to RuleAttachmentData
 */
const isRuleAttachmentData = (data: unknown): data is RuleAttachmentData => {
  return ruleAttachmentDataSchema.safeParse(data).success;
};

/**
 * Creates the definition for the `rule` (detection_rule) attachment type.
 *
 * This attachment type is used for security detection rules with capabilities to:
 * - Enable/disable the rule
 * - Preview and add exceptions
 * - View rule details and query
 */
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
    getTools: () => [platformCoreTools.generateEsql, platformCoreTools.productDocumentation],
    getAgentDescription: () => {
      const description = `You have access to a security detection rule.

{ruleData}

## Investigation Steps
1. Review the rule query and logic
2. Check if the rule is currently enabled
3. Review any existing exceptions
4. Analyze the rule's detection capabilities`;
      return description;
    },

    // Skills to reference when this attachment is present
    skills: ['security.detection_rules', 'security.exception_lists'],

    // LLM guidance for detection rule operations
    skillContent: `# Detection Rule Operations

A security detection rule is attached to this conversation.

## Available Actions
- **Review**: Understand what the rule detects and how
- **Enable/Disable**: Change the rule's active status
- **Exceptions**: Preview or add exceptions to reduce false positives
- **Analyze Query**: Understand the rule's KQL/EQL query

## Rule Analysis
When analyzing a rule:
1. Understand the detection logic (query syntax)
2. Review severity and risk score
3. Check for MITRE ATT&CK mappings
4. Identify potential false positive sources
5. Suggest exception patterns if needed

## Exception Management
Before adding exceptions:
1. Confirm the pattern matches legitimate activity
2. Use preview to verify exception impact
3. Make exceptions specific to avoid over-suppression
4. Document the reason for the exception

## Rule Tuning Tips
- Consider time-based patterns
- Look for specific user/host patterns
- Check for process/command line variations
- Review network indicators`,

    // Entity recognition patterns for auto-attachment
    entityRecognition: {
      patterns: [
        /rule\s+["']?([a-zA-Z0-9_-]+)["']?/i,
        /detection\s+rule\s+["']?([a-zA-Z0-9_-]+)["']?/i,
        /security\s+rule\s+["']?([a-zA-Z0-9_-]+)["']?/i,
      ],
      extractId: (match) => match[1],
      resolve: async (entityId, context) => {
        // TODO: Implement resolution from detection rules API
        return null;
      },
    },
  };
};

const formatRuleData = (data: RuleAttachmentData): string => {
  // Support both legacy text format and new structured format
  if (data.text) {
    return data.text;
  }

  const parts: string[] = [];

  if (data.ruleName) {
    parts.push(`## Detection Rule: ${data.ruleName}`);
  }

  if (data.ruleId) {
    parts.push(`**Rule ID**: ${data.ruleId}`);
  }

  if (data.enabled !== undefined) {
    parts.push(`**Status**: ${data.enabled ? 'Enabled' : 'Disabled'}`);
  }

  if (data.severity) {
    parts.push(`**Severity**: ${data.severity}`);
  }

  if (data.ruleType) {
    parts.push(`**Type**: ${data.ruleType}`);
  }

  if (data.ruleDescription) {
    parts.push(`\n**Description**: ${data.ruleDescription}`);
  }

  if (data.query) {
    parts.push('\n**Query**:');
    parts.push('```');
    parts.push(data.query);
    parts.push('```');
  }

  return parts.join('\n');
};
