/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import type { AttachmentTypeDefinition } from '@kbn/agent-builder-server/attachments';
import type { Attachment } from '@kbn/agent-builder-common/attachments';
import { platformCoreTools } from '@kbn/agent-builder-common';
import { SecurityAgentBuilderAttachments } from '../../../common/constants';
import { securityAttachmentDataSchema } from './security_attachment_data_schema';
import { SECURITY_ALERTS_TOOL_ID } from '../tools';

/**
 * Schema for case attachment data.
 */
export const caseAttachmentDataSchema = securityAttachmentDataSchema.extend({
  /**
   * The case ID.
   */
  caseId: z.string(),
  /**
   * The case title.
   */
  title: z.string(),
  /**
   * The case description.
   */
  description: z.string().optional(),
  /**
   * The case status.
   */
  status: z.enum(['open', 'in-progress', 'closed']).optional(),
  /**
   * The case severity.
   */
  severity: z.enum(['low', 'medium', 'high', 'critical']).optional(),
  /**
   * The case owner (application that created it).
   */
  owner: z.string().optional(),
  /**
   * Tags associated with the case.
   */
  tags: z.array(z.string()).optional(),
  /**
   * Number of comments on the case.
   */
  totalComment: z.number().optional(),
  /**
   * Number of alerts attached to the case.
   */
  totalAlerts: z.number().optional(),
  /**
   * Assignees.
   */
  assignees: z.array(z.string()).optional(),
  /**
   * Created date.
   */
  createdAt: z.string().optional(),
  /**
   * Last updated date.
   */
  updatedAt: z.string().optional(),
});

/**
 * Data for a case attachment.
 */
export type CaseAttachmentData = z.infer<typeof caseAttachmentDataSchema>;

/**
 * Type guard to narrow attachment data to CaseAttachmentData.
 */
const isCaseAttachmentData = (data: unknown): data is CaseAttachmentData => {
  return caseAttachmentDataSchema.safeParse(data).success;
};

/**
 * Creates the definition for the `case` attachment type.
 *
 * This attachment type is used for security cases with capabilities to:
 * - Add comments to the case
 * - Update case status
 * - View case details and related alerts
 */
export const createCaseAttachmentType = (): AttachmentTypeDefinition => {
  return {
    id: SecurityAgentBuilderAttachments.case,
    validate: (input) => {
      const parseResult = caseAttachmentDataSchema.safeParse(input);
      if (parseResult.success) {
        return { valid: true, data: parseResult.data };
      } else {
        return { valid: false, error: parseResult.error.message };
      }
    },
    format: (attachment: Attachment<string, unknown>) => {
      const data = attachment.data;
      if (!isCaseAttachmentData(data)) {
        throw new Error(`Invalid case attachment data for attachment ${attachment.id}`);
      }
      return {
        getRepresentation: () => {
          return { type: 'text', value: formatCaseData(data) };
        },
      };
    },
    getTools: () => [
      platformCoreTools.cases,
      SECURITY_ALERTS_TOOL_ID,
      platformCoreTools.productDocumentation,
    ],
    getAgentDescription: () => {
      return `You have access to a security case for incident tracking and collaboration.

CASE DATA:
{caseData}

## Available Actions
1. Add comments to document findings
2. Update case status as investigation progresses
3. Review attached alerts and evidence
4. Coordinate with assignees`;
    },

    // Skills to reference when this attachment is present
    skills: ['security.cases', 'security.alerts'],

    // LLM guidance for case operations
    skillContent: `# Security Case Management

A security case is attached to this conversation for incident tracking.

## Case Lifecycle
1. **Open**: Initial state when a case is created
2. **In Progress**: Investigation is actively ongoing
3. **Closed**: Investigation is complete

## Available Actions
- **Add Comment**: Document findings, analysis, or coordination notes
- **Update Status**: Change the case status as investigation progresses
- **Review Alerts**: Check alerts attached to this case
- **Assign**: Update case assignees

## Best Practices
- Document all significant findings as comments
- Update status promptly when investigation state changes
- Link related alerts and evidence to the case
- Use tags for categorization and searchability
- Keep stakeholders informed through comments

## Comment Guidelines
When adding comments:
- Be specific about what was investigated
- Include timestamps for activities
- Reference specific alerts or evidence
- Note any actions taken or recommended`,

    // Entity recognition patterns for auto-attachment
    entityRecognition: {
      patterns: [
        /case\s+["']?([a-zA-Z0-9_-]+)["']?/i,
        /security\s+case\s+["']?([a-zA-Z0-9_-]+)["']?/i,
        /incident\s+["']?([a-zA-Z0-9_-]+)["']?/i,
      ],
      extractId: (match) => match[1],
      resolve: async (entityId, context) => {
        // TODO: Implement resolution from cases API
        return null;
      },
    },
  };
};

/**
 * Formats case data for LLM representation.
 */
const formatCaseData = (data: CaseAttachmentData): string => {
  const parts: string[] = [];

  parts.push(`## Case: ${data.title}`);
  parts.push(`**Case ID**: ${data.caseId}`);

  if (data.status) {
    const statusEmoji = {
      open: '🔵',
      'in-progress': '🟡',
      closed: '✅',
    };
    parts.push(`**Status**: ${statusEmoji[data.status] || ''} ${data.status}`);
  }

  if (data.severity) {
    const severityEmoji = {
      low: '🟢',
      medium: '🟡',
      high: '🟠',
      critical: '🔴',
    };
    parts.push(`**Severity**: ${severityEmoji[data.severity] || ''} ${data.severity}`);
  }

  if (data.owner) {
    parts.push(`**Owner**: ${data.owner}`);
  }

  if (data.assignees && data.assignees.length > 0) {
    parts.push(`**Assignees**: ${data.assignees.join(', ')}`);
  }

  if (data.tags && data.tags.length > 0) {
    parts.push(`**Tags**: ${data.tags.join(', ')}`);
  }

  if (data.totalAlerts !== undefined) {
    parts.push(`**Attached Alerts**: ${data.totalAlerts}`);
  }

  if (data.totalComment !== undefined) {
    parts.push(`**Comments**: ${data.totalComment}`);
  }

  if (data.createdAt) {
    parts.push(`**Created**: ${data.createdAt}`);
  }

  if (data.updatedAt) {
    parts.push(`**Last Updated**: ${data.updatedAt}`);
  }

  if (data.description) {
    parts.push(`\n**Description**:\n${data.description}`);
  }

  return parts.join('\n');
};
