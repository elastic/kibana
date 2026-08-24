/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { z } from '@kbn/zod/v4';
import type { CommonTriggerDefinition } from '@kbn/workflows-extensions/common';

/**
 * Custom workflow triggers owned by the nightshift_investigations plugin. Users subscribe to these
 * in their workflow YAML (e.g. `triggers: [{ type: nightshift-investigations.completed }]`) to run
 * a workflow when an investigation changes lifecycle, regardless of what initiated it (significant
 * event, alert, manual). Payloads are intentionally lean; consumers needing the full result can
 * fetch it via GET /internal/nightshift/investigations/{id} using `investigation_id`.
 */

// Trigger ids: kebab-case namespace, camelCase event.
export const INVESTIGATION_STARTED_TRIGGER_ID = 'nightshift-investigations.started' as const;
export const INVESTIGATION_COMPLETED_TRIGGER_ID = 'nightshift-investigations.completed' as const;
export const INVESTIGATION_FAILED_TRIGGER_ID = 'nightshift-investigations.failed' as const;

const subjectSchema = z.object({
  type: z.enum(['significant_event', 'alert']).describe('Kind of entity being investigated.'),
  id: z.string().describe('Identifier of the investigated entity.'),
});

const baseInvestigationSchema = z.object({
  investigation_id: z.string().describe('ID of the investigation (the workflow execution ID).'),
  status: z
    .enum(['pending', 'running', 'completed', 'failed', 'cancelled'])
    .describe('Current lifecycle status of the investigation.'),
  subject: subjectSchema.describe('The entity this investigation is about.'),
  started_at: z.string().describe('When the investigation started (ISO 8601 timestamp).'),
});

export type InvestigationsTriggerBasePayload = z.infer<typeof baseInvestigationSchema>;

const completedSchema = baseInvestigationSchema.extend({
  status: z.literal('completed').describe('Always "completed" for this trigger.'),
  completed_at: z.string().describe('When the investigation finished (ISO 8601 timestamp).'),
});

const failedSchema = baseInvestigationSchema.extend({
  status: z.literal('failed').describe('Always "failed" for this trigger.'),
  completed_at: z.string().describe('When the investigation finished (ISO 8601 timestamp).'),
});

export type InvestigationCompletedTriggerPayload = z.infer<typeof completedSchema>;
export type InvestigationFailedTriggerPayload = z.infer<typeof failedSchema>;

/**
 * Maps each nightshift-investigations workflow trigger id to the exact payload shape emitted for
 * it, so a call site cannot pass the wrong payload for a given trigger id.
 */
export interface InvestigationsTriggerPayloadMap {
  [INVESTIGATION_STARTED_TRIGGER_ID]: InvestigationsTriggerBasePayload;
  [INVESTIGATION_COMPLETED_TRIGGER_ID]: InvestigationCompletedTriggerPayload;
  [INVESTIGATION_FAILED_TRIGGER_ID]: InvestigationFailedTriggerPayload;
}

/** Union of every nightshift-investigations workflow trigger id. */
export type InvestigationsTriggerId = keyof InvestigationsTriggerPayloadMap;

interface DefinitionCopy {
  idKey: string;
  title: string;
  description: string;
  details: string;
  example: string;
  snippetCondition: string;
}

const buildDefinition = (
  triggerId: InvestigationsTriggerId,
  eventSchema: z.ZodType,
  { idKey, title, description, details, example, snippetCondition }: DefinitionCopy
): CommonTriggerDefinition => ({
  id: triggerId,
  stability: 'tech_preview',
  eventSchema,
  title: i18n.translate(`xpack.nightshiftInvestigations.workflowTriggers.${idKey}.title`, {
    defaultMessage: title,
  }),
  description: i18n.translate(
    `xpack.nightshiftInvestigations.workflowTriggers.${idKey}.description`,
    {
      defaultMessage: description,
    }
  ),
  documentation: {
    details: i18n.translate(
      `xpack.nightshiftInvestigations.workflowTriggers.${idKey}.documentation.details`,
      {
        defaultMessage: details,
      }
    ),
    examples: [
      i18n.translate(
        `xpack.nightshiftInvestigations.workflowTriggers.${idKey}.documentation.example`,
        {
          defaultMessage: example,
          values: { triggerId },
        }
      ),
    ],
  },
  snippets: { condition: snippetCondition },
});

const notifyExample = (messageLine: string): string => `## Notify on a lifecycle change
\`\`\`yaml
triggers:
  - type: {triggerId}
steps:
  - name: notify
    type: action.slack
    with:
      message: "${messageLine}"
\`\`\``;

export const investigationStartedTriggerCommonDefinition = buildDefinition(
  INVESTIGATION_STARTED_TRIGGER_ID,
  baseInvestigationSchema,
  {
    idKey: 'investigationStarted',
    title: 'Nightshift investigations - Investigation started',
    description: 'Emitted when an investigation starts.',
    details:
      'Emitted when an investigation begins for any subject (significant event, alert, manual). Filter with KQL on event.* (e.g. event.subject.type).',
    example: notifyExample('Investigation started for {{event.subject.type}} {{event.subject.id}}'),
    snippetCondition: 'event.subject.type: "significant_event"',
  }
);

export const investigationCompletedTriggerCommonDefinition = buildDefinition(
  INVESTIGATION_COMPLETED_TRIGGER_ID,
  completedSchema,
  {
    idKey: 'investigationCompleted',
    title: 'Nightshift investigations - Investigation completed',
    description: 'Emitted when an investigation finishes successfully.',
    details:
      'Emitted when an investigation finishes with status completed. Use event.investigation_id to fetch the full investigation result.',
    example: notifyExample('Investigation {{event.investigation_id}} completed'),
    snippetCondition: 'event.status: "completed"',
  }
);

export const investigationFailedTriggerCommonDefinition = buildDefinition(
  INVESTIGATION_FAILED_TRIGGER_ID,
  failedSchema,
  {
    idKey: 'investigationFailed',
    title: 'Nightshift investigations - Investigation failed',
    description: 'Emitted when an investigation fails.',
    details:
      'Emitted when an investigation finishes with status failed. Use event.investigation_id to fetch error details.',
    example: notifyExample('Investigation {{event.investigation_id}} failed'),
    snippetCondition: 'event.status: "failed"',
  }
);

export const investigationsTriggerCommonDefinitions: CommonTriggerDefinition[] = [
  investigationStartedTriggerCommonDefinition,
  investigationCompletedTriggerCommonDefinition,
  investigationFailedTriggerCommonDefinition,
];
