/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { z, lazySchema } from '@kbn/zod/v4';
import type { CommonTriggerDefinition } from '@kbn/workflows-extensions/common';
import {
  SIGNIFICANT_EVENT_MANUAL_STATUS_OPTIONS,
  severitySchema,
} from '@kbn/significant-events-schema';

// Trigger ids: kebab-case namespace, camelCase event.
export const EVENT_CREATED_TRIGGER_ID = 'significant-events.eventCreated' as const;
export const EVENT_STATUS_CHANGED_TRIGGER_ID = 'significant-events.eventStatusChanged' as const;
export const KNOWLEDGE_INDICATORS_CHANGED_TRIGGER_ID =
  'significant-events.knowledgeIndicatorsChanged' as const;

// Source ids are saved object ids, capped at 255 characters. A write reports the sources it
// touched, which is one today; the array bound keeps a batched emit within a page of sources.
const MAX_SOURCE_ID_LENGTH = 255;
const MAX_CHANGED_SOURCE_IDS = 100;

const baseEventSchema = z.object({
  event_id: z
    .string()
    .describe('Stable incident key shared across every version of this significant event.'),
  title: z.string().describe('Human-readable incident label.'),
  summary: z.string().describe('Short human-readable description of what is happening.'),
  status: z
    .enum(SIGNIFICANT_EVENT_MANUAL_STATUS_OPTIONS)
    .describe(
      'Current lifecycle status: "active" or "inactive". An event winding down ("recovering") is still live and is reported as "active".'
    ),
  severity: severitySchema.describe('Severity: "critical", "high", "medium", or "low".'),
  source_ids: z.array(z.string()).describe('Nightshift source ids associated with this event.'),
  occurred_at: z.string().describe('When the triggered event happened (ISO 8601 timestamp).'),
});

export type SignificantEventTriggerBasePayload = z.infer<typeof baseEventSchema>;

const eventStatusChangedSchema = baseEventSchema.extend({
  previous_status: z
    .enum(SIGNIFICANT_EVENT_MANUAL_STATUS_OPTIONS)
    .describe('The status the event had before this change.'),
});

export type EventStatusChangedTriggerPayload = z.infer<typeof eventStatusChangedSchema>;

const knowledgeIndicatorsChangedSchema = lazySchema(() =>
  z.object({
    source_ids: z
      .array(z.string().min(1).max(MAX_SOURCE_ID_LENGTH))
      .min(1)
      .max(MAX_CHANGED_SOURCE_IDS)
      .describe('Nightshift source ids whose knowledge indicators changed.'),
  })
);

export type KnowledgeIndicatorsChangedTriggerPayload = z.infer<
  typeof knowledgeIndicatorsChangedSchema
>;

/**
 * Maps each significant-events workflow trigger id to the exact payload shape emitted for it. Used
 * to type the server-side emitter end-to-end so a call site cannot pass the wrong payload for a
 * given trigger id.
 */
export interface SignificantEventsTriggerPayloadMap {
  [EVENT_CREATED_TRIGGER_ID]: SignificantEventTriggerBasePayload;
  [EVENT_STATUS_CHANGED_TRIGGER_ID]: EventStatusChangedTriggerPayload;
  [KNOWLEDGE_INDICATORS_CHANGED_TRIGGER_ID]: KnowledgeIndicatorsChangedTriggerPayload;
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
          'Emitted when the first version of a significant event is created. Filter with KQL on event.* (e.g. event.severity, event.status, event.source_ids).',
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
      condition: 'event.severity: "critical"'
\`\`\``,
          values: { triggerId: EVENT_CREATED_TRIGGER_ID },
        }
      ),
    ],
  },
  snippets: { condition: 'event.severity: "critical"' },
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
      defaultMessage:
        'Emitted when a significant event status changes between active and inactive. A move between active and recovering is not reported: both read as "active".',
    }
  ),
  documentation: {
    details: i18n.translate(
      'xpack.significantEvents.workflowTriggers.eventStatusChanged.documentation.details',
      {
        defaultMessage:
          'Emitted when a significant event moves between statuses. The payload includes event.status and event.previous_status. event.status: "inactive" fires both when an event recovers and when an operator deactivates it.',
      }
    ),
    examples: [
      i18n.translate(
        'xpack.significantEvents.workflowTriggers.eventStatusChanged.documentation.example',
        {
          defaultMessage: `## Run when an event becomes inactive (recovery or operator deactivation)
\`\`\`yaml
triggers:
  - type: {triggerId}
    on:
      condition: 'event.status: "inactive"'
\`\`\``,
          values: { triggerId: EVENT_STATUS_CHANGED_TRIGGER_ID },
        }
      ),
    ],
  },
  snippets: { condition: 'event.status: "inactive"' },
};

export const knowledgeIndicatorsChangedTriggerCommonDefinition: CommonTriggerDefinition = {
  id: KNOWLEDGE_INDICATORS_CHANGED_TRIGGER_ID,
  stability: 'tech_preview',
  eventSchema: knowledgeIndicatorsChangedSchema,
  title: i18n.translate(
    'xpack.significantEvents.workflowTriggers.knowledgeIndicatorsChanged.title',
    {
      defaultMessage: 'Significant events - Knowledge indicators changed',
    }
  ),
  description: i18n.translate(
    'xpack.significantEvents.workflowTriggers.knowledgeIndicatorsChanged.description',
    {
      defaultMessage:
        "Emitted after a committed write to the knowledge indicators of a space's sources.",
    }
  ),
  documentation: {
    details: i18n.translate(
      'xpack.significantEvents.workflowTriggers.knowledgeIndicatorsChanged.documentation.details',
      {
        defaultMessage:
          'Emitted after a write to knowledge indicators commits. A write that changed nothing or failed emits nothing. The payload names the sources in event.source_ids; read their knowledge indicators again to see what changed.',
      }
    ),
    examples: [
      i18n.translate(
        'xpack.significantEvents.workflowTriggers.knowledgeIndicatorsChanged.documentation.example',
        {
          defaultMessage: `## Run when the knowledge indicators of one source change
\`\`\`yaml
triggers:
  - type: {triggerId}
    on:
      condition: 'event.source_ids: "my-source-id"'
\`\`\``,
          values: { triggerId: KNOWLEDGE_INDICATORS_CHANGED_TRIGGER_ID },
        }
      ),
    ],
  },
  snippets: { condition: 'event.source_ids: "my-source-id"' },
};

export const significantEventsTriggerCommonDefinitions: CommonTriggerDefinition[] = [
  eventCreatedTriggerCommonDefinition,
  eventStatusChangedTriggerCommonDefinition,
  knowledgeIndicatorsChangedTriggerCommonDefinition,
];
