/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { z } from '@kbn/zod/v4';
import { platformCoreTools } from '@kbn/agent-builder-common';
import type { AttachmentTypeDefinition } from '@kbn/agent-builder-server/attachments';
import { SecurityAgentBuilderAttachments } from '../../../common/constants';

/**
 * Caps the number of events a single timeline attachment can carry. Forensic reconstructions
 * are a narrative of the notable steps, not a telemetry dump — anything longer belongs in a
 * scoped ES|QL query the analyst runs from the investigation.
 */
export const MAX_TIMELINE_EVENTS = 50;

const investigationTimelineEventSchema = z.object({
  /** Event time as an ISO-8601 string, taken verbatim from `@timestamp` in the telemetry. */
  timestamp: z.string().min(1).max(64),
  /** Host the event occurred on. Required per event so a multi-host chain reads unambiguously. */
  host: z.string().min(1).max(256),
  /**
   * What happened, with the specifics an analyst needs to act: process and parent names, PIDs,
   * acting user, command lines, file paths, addresses, accounts. A bare classification
   * ("lateral movement") is not enough on its own.
   */
  description: z.string().min(1).max(2000),
});

/** The payload is the ordered event list itself, earliest first — there is no wrapper object. */
export const investigationTimelineAttachmentDataSchema = z
  .array(investigationTimelineEventSchema)
  .max(MAX_TIMELINE_EVENTS);

export type InvestigationTimelineAttachmentData = z.infer<
  typeof investigationTimelineAttachmentDataSchema
>;

const formatTimelineForAgent = (events: InvestigationTimelineAttachmentData): string => {
  const header = 'Forensic attack timeline';

  if (events.length === 0) {
    return `${header}\nNo events were reconstructed from the available telemetry.`;
  }

  const lines = events.map(
    ({ timestamp, host, description }) => `  ${timestamp} ${host} — ${description}`
  );

  return [`${header} (${events.length} events, chronological)`, ...lines].join('\n');
};

/**
 * Creates the definition for the `security.investigation.timeline` attachment type, which carries
 * the chronological reconstruction produced by the endpoint forensic analysis worker.
 */
export const createInvestigationTimelineAttachmentType = (): AttachmentTypeDefinition => {
  return {
    id: SecurityAgentBuilderAttachments.investigationTimeline,
    validate: (input) => {
      const parseResult = investigationTimelineAttachmentDataSchema.safeParse(input);
      if (parseResult.success) {
        return { valid: true, data: parseResult.data };
      }
      return { valid: false, error: parseResult.error.message };
    },
    format: (attachment) => {
      const parseResult = investigationTimelineAttachmentDataSchema.safeParse(attachment.data);
      if (!parseResult.success) {
        throw new Error(
          `Invalid investigation timeline attachment data for attachment ${attachment.id}`
        );
      }
      const data = parseResult.data;
      return {
        getRepresentation: () => ({ type: 'text', value: formatTimelineForAgent(data) }),
      };
    },
    getTools: () => [platformCoreTools.generateEsql, platformCoreTools.executeEsql],
    getAgentDescription: () => {
      return `A ${SecurityAgentBuilderAttachments.investigationTimeline} attachment holds the chronological attack reconstruction for an investigation.

The payload is the event list itself, ordered earliest first: an array of { timestamp, host, description }.

Every event names the host it occurred on, so a chain that moves between hosts can be read directly. \`description\` already carries the specifics (processes, PIDs, users, paths, command lines, addresses) — quote it rather than re-summarizing it into a classification.

The events are already ordered and already scoped to the investigation — present them as a timeline and do not reorder or re-derive them. To extend the reconstruction beyond what is attached, run a new scoped ES|QL query rather than inferring additional events.`;
    },
  };
};
