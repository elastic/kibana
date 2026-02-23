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
 * Schema for timeline attachment data.
 */
export const timelineAttachmentDataSchema = securityAttachmentDataSchema.extend({
  /**
   * The timeline ID.
   */
  timelineId: z.string(),
  /**
   * The timeline title.
   */
  title: z.string(),
  /**
   * The timeline description.
   */
  description: z.string().optional(),
  /**
   * The timeline type.
   */
  timelineType: z.enum(['default', 'template']).optional(),
  /**
   * Whether the timeline is a favorite.
   */
  favorite: z.boolean().optional(),
  /**
   * The status of the timeline.
   */
  status: z.enum(['active', 'draft', 'immutable']).optional(),
  /**
   * Number of events in the timeline.
   */
  eventCount: z.number().optional(),
  /**
   * Number of pinned events.
   */
  pinnedEventCount: z.number().optional(),
  /**
   * Timeline notes.
   */
  notes: z.string().optional(),
  /**
   * Created date.
   */
  createdAt: z.string().optional(),
  /**
   * Last updated date.
   */
  updatedAt: z.string().optional(),
  /**
   * KQL query filter.
   */
  kqlQuery: z.string().optional(),
});

/**
 * Data for a timeline attachment.
 */
export type TimelineAttachmentData = z.infer<typeof timelineAttachmentDataSchema>;

/**
 * Type guard to narrow attachment data to TimelineAttachmentData.
 */
const isTimelineAttachmentData = (data: unknown): data is TimelineAttachmentData => {
  return timelineAttachmentDataSchema.safeParse(data).success;
};

/**
 * Creates the definition for the `timeline` attachment type.
 *
 * This attachment type is used for security timelines with capabilities to:
 * - Add events to the timeline
 * - Update notes
 * - View timeline events and analysis
 */
export const createTimelineAttachmentType = (): AttachmentTypeDefinition => {
  return {
    id: SecurityAgentBuilderAttachments.timeline,
    validate: (input) => {
      const parseResult = timelineAttachmentDataSchema.safeParse(input);
      if (parseResult.success) {
        return { valid: true, data: parseResult.data };
      } else {
        return { valid: false, error: parseResult.error.message };
      }
    },
    format: (attachment: Attachment<string, unknown>) => {
      const data = attachment.data;
      if (!isTimelineAttachmentData(data)) {
        throw new Error(`Invalid timeline attachment data for attachment ${attachment.id}`);
      }
      return {
        getRepresentation: () => {
          return { type: 'text', value: formatTimelineData(data) };
        },
      };
    },
    getTools: () => [
      SECURITY_ALERTS_TOOL_ID,
      platformCoreTools.generateEsql,
      platformCoreTools.productDocumentation,
    ],
    getAgentDescription: () => {
      return `You have access to a security timeline for threat investigation and analysis.

TIMELINE DATA:
{timelineData}

## Available Actions
1. Review events in the timeline
2. Add notes to document analysis
3. Pin important events
4. Analyze the attack chain`;
    },

    // Skills to reference when this attachment is present
    skills: ['security.timelines', 'security.alerts'],

    // LLM guidance for timeline operations
    skillContent: `# Security Timeline Investigation

A security timeline is attached for threat analysis and investigation.

## Timeline Purpose
Timelines are used to:
- Correlate events across time
- Build an attack narrative
- Document investigation findings
- Share analysis with team members

## Investigation Workflow
1. **Review Events**: Examine the events collected in the timeline
2. **Identify Patterns**: Look for attack patterns and sequences
3. **Pin Key Events**: Mark important events for reference
4. **Add Notes**: Document findings and analysis
5. **Build Narrative**: Construct the attack story

## Analysis Tips
- Look for temporal patterns (events clustered in time)
- Identify the attack chain (initial access → execution → persistence)
- Note affected entities (hosts, users, processes)
- Check for lateral movement indicators
- Document evidence for each stage

## Notes Best Practices
- Be specific about what each event represents
- Link related events in your analysis
- Include timestamps and entity names
- Note any gaps or uncertainties
- Suggest follow-up investigation steps`,

    // Entity recognition patterns for auto-attachment
    entityRecognition: {
      patterns: [
        /timeline\s+["']?([a-zA-Z0-9_-]+)["']?/i,
        /security\s+timeline\s+["']?([a-zA-Z0-9_-]+)["']?/i,
        /investigation\s+timeline\s+["']?([a-zA-Z0-9_-]+)["']?/i,
      ],
      extractId: (match) => match[1],
      resolve: async (entityId, context) => {
        // TODO: Implement resolution from timelines API
        return null;
      },
    },
  };
};

/**
 * Formats timeline data for LLM representation.
 */
const formatTimelineData = (data: TimelineAttachmentData): string => {
  const parts: string[] = [];

  parts.push(`## Timeline: ${data.title}`);
  parts.push(`**Timeline ID**: ${data.timelineId}`);

  if (data.timelineType) {
    parts.push(`**Type**: ${data.timelineType}`);
  }

  if (data.status) {
    parts.push(`**Status**: ${data.status}`);
  }

  if (data.eventCount !== undefined) {
    parts.push(`**Events**: ${data.eventCount}`);
  }

  if (data.pinnedEventCount !== undefined) {
    parts.push(`**Pinned Events**: ${data.pinnedEventCount}`);
  }

  if (data.favorite) {
    parts.push(`**Favorited**: Yes`);
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

  if (data.kqlQuery) {
    parts.push(`\n**Query Filter**:`);
    parts.push('```');
    parts.push(data.kqlQuery);
    parts.push('```');
  }

  if (data.notes) {
    parts.push(`\n**Notes**:\n${data.notes}`);
  }

  return parts.join('\n');
};
