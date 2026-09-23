/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { z } from '@kbn/zod/v4';
import type { CommonTriggerDefinition } from '@kbn/workflows-extensions/common';
import { SIGNIFICANT_EVENT_STATUS_OPTIONS, SEVERITY_OPTIONS } from '@kbn/significant-events-schema';

// Trigger ids: kebab-case namespace, camelCase event.
export const EVENT_CREATED_TRIGGER_ID = 'significant-events.eventCreated' as const;
export const EVENT_STATUS_CHANGED_TRIGGER_ID = 'significant-events.eventStatusChanged' as const;

const baseEventSchema = z.object({
  event_id: z
    .string()
    .describe('Stable incident key shared across every version of this significant event.'),
  event_uuid: z.string().describe('Unique ID of this specific (append-only) event version.'),
  title: z.string().describe('Human-readable incident label.'),
  summary: z.string().describe('Short human-readable description of what is happening.'),
  status: z
    .enum(SIGNIFICANT_EVENT_STATUS_OPTIONS)
    .describe('Current lifecycle status: "pending", "open", "closed", or "dismissed".'),
  severity: z
    .enum(SEVERITY_OPTIONS)
    .describe('Severity: "80-critical", "60-high", "40-medium", or "20-low".'),
  stream_names: z.array(z.string()).describe('Data streams associated with this event.'),
  occurred_at: z.string().describe('When the triggered event happened (ISO 8601 timestamp).'),
});

export type SignificantEventTriggerBasePayload = z.infer<typeof baseEventSchema>;

const eventStatusChangedSchema = baseEventSchema.extend({
  previous_status: z
    .enum(SIGNIFICANT_EVENT_STATUS_OPTIONS)
    .describe('The status the event had before this change.'),
});

export type EventStatusChangedTriggerPayload = z.infer<typeof eventStatusChangedSchema>;

/**
 * Maps each significant-events workflow trigger id to the exact payload shape emitted for it. Used
 * to type the server-side emitter end-to-end so a call site cannot pass the wrong payload for a
 * given trigger id.
 */
export interface SignificantEventsTriggerPayloadMap {
  [EVENT_CREATED_TRIGGER_ID]: SignificantEventTriggerBasePayload;
  [EVENT_STATUS_CHANGED_TRIGGER_ID]: EventStatusChangedTriggerPayload;
}

/** Union of every significant-events workflow trigger id. */
export type SignificantEventsTriggerId = keyof SignificantEventsTriggerPayloadMap;

export const eventCreatedTriggerCommonDefinition: CommonTriggerDefinition = {
  id: EVENT_CREATED_TRIGGER_ID,
  stability: 'tech_preview',
  eventSchema: baseEventSchema,
  title: i18n.translate('xpack.significantEvents.workflowTriggers.eventCreated.title', {
    defaultMessage: 'Significant events - Event created',
  }),
  description: i18n.translate('xpack.significantEvents.workflowTriggers.eventCreated.description', {
    defaultMessage: 'Emitted when a new significant event is created.',
  }),
  documentation: {
    details: i18n.translate(
      'xpack.significantEvents.workflowTriggers.eventCreated.documentation.details',
      {
        defaultMessage:
          'Emitted when the first version of a significant event is created. Filter with KQL on event.* (e.g. event.severity, event.status, event.stream_names).',
      }
    ),
    examples: [
      i18n.translate(
        'xpack.significantEvents.workflowTriggers.eventCreated.documentation.example',
        {
          defaultMessage: `## Run only for critical events
\`\`\`yaml
triggers:
  - type: {triggerId}
    on:
      condition: 'event.severity: "80-critical"'
\`\`\``,
          values: { triggerId: EVENT_CREATED_TRIGGER_ID },
        }
      ),
    ],
  },
  snippets: { condition: 'event.severity: "80-critical"' },
};

export const eventStatusChangedTriggerCommonDefinition: CommonTriggerDefinition = {
  id: EVENT_STATUS_CHANGED_TRIGGER_ID,
  stability: 'tech_preview',
  eventSchema: eventStatusChangedSchema,
  title: i18n.translate('xpack.significantEvents.workflowTriggers.eventStatusChanged.title', {
    defaultMessage: 'Significant events - Event status changed',
  }),
  description: i18n.translate(
    'xpack.significantEvents.workflowTriggers.eventStatusChanged.description',
    {
      defaultMessage: 'Emitted when a significant event status changes.',
    }
  ),
  documentation: {
    details: i18n.translate(
      'xpack.significantEvents.workflowTriggers.eventStatusChanged.documentation.details',
      {
        defaultMessage:
          'Emitted when a significant event moves between statuses. The payload includes event.status and event.previous_status.',
      }
    ),
    examples: [
      i18n.translate(
        'xpack.significantEvents.workflowTriggers.eventStatusChanged.documentation.example',
        {
          defaultMessage: `## Run when an event is closed
\`\`\`yaml
triggers:
  - type: {triggerId}
    on:
      condition: 'event.status: "closed"'
\`\`\``,
          values: { triggerId: EVENT_STATUS_CHANGED_TRIGGER_ID },
        }
      ),
    ],
  },
  snippets: { condition: 'event.status: "closed"' },
};

export const significantEventsTriggerCommonDefinitions: CommonTriggerDefinition[] = [
  eventCreatedTriggerCommonDefinition,
  eventStatusChangedTriggerCommonDefinition,
];
