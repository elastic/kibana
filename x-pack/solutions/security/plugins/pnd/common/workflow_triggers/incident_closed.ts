/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { PND_INCIDENT_CLOSED_TRIGGER_ID } from '@kbn/pnd-common';
import type { CommonTriggerDefinition } from '@kbn/workflows-extensions/common';
import { z } from '@kbn/zod/v4';

/**
 * Payload contract for `pnd.incidentClosed`.
 *
 * This is the literal implementation of NotDaybreak P3 / D14: incident creation (and here,
 * containment) is a first-class subscribable signal, so a downstream Watch Orchestrator subscribes to
 * a signal rather than being invoked by the Watch Floor that emitted it.
 *
 * The schema carries **id + non-sensitive metadata only** — the same information-disclosure
 * reasoning as the Attack Discovery trigger (security finding S6). A trigger event is persisted and
 * readable by anyone who can read the workflow trigger-event index, so it must never carry
 * investigation content, alert bodies, or anything an unprivileged reader should not see.
 *
 * `.strict()` makes the schema **reject** unknown fields (rather than silently strip them), so a
 * future emit site cannot accidentally leak an extra property through the event.
 */
export const IncidentClosedEventSchema = z
  .object({
    correlationId: z
      .string()
      .min(1)
      .max(1024)
      .describe('Attack Discovery 2.0 alert id the closed incident was investigated for'),
    incidentConversationId: z
      .string()
      .min(1)
      .max(1024)
      .describe('Deterministic UUIDv5 id of the Incident conversation that was contained'),
    spaceId: z.string().min(1).max(1024).describe('Kibana space the incident was contained in'),
    watchId: z
      .string()
      .min(1)
      .max(1024)
      .describe('Managed watch workflow id that owned the containment gate'),
  })
  .strict();

export type IncidentClosedEvent = z.infer<typeof IncidentClosedEventSchema>;

/**
 * `pnd.incidentClosed` trigger definition.
 *
 * Registered by the PND server in `setup` and emitted when the containment HITL gate
 * (`await_incident_contained`) is approved.
 *
 * ⚠️ It deliberately has **NO subscriber**, and that is not dead code to clean up. This signal is a
 * lifecycle **fact** — *an incident closed*, ids only. What the Post-Incident Watch actually needs is
 * a **claim** — *there is a coverage gap here* — which is `security.detectionChangeSignal`
 * (`@kbn/pnd-common`), emitted from the same gate, independently, and carrying the analyst's own gap
 * description plus refs to the evidence. Keeping the two separate is what lets the claim carry prose
 * without this schema inheriting it, and leaves a subscribable close event for the next consumer that
 * wants the fact without the claim. See the register row in the PND README and ADR-014.
 */
export const incidentClosedTriggerCommonDefinition: CommonTriggerDefinition<
  typeof IncidentClosedEventSchema
> = {
  id: PND_INCIDENT_CLOSED_TRIGGER_ID,
  stability: 'tech_preview',
  eventSchema: IncidentClosedEventSchema,
  title: i18n.translate('xpack.pnd.workflowTriggers.incidentClosed.title', {
    defaultMessage: 'PND - Incident closed',
  }),
  description: i18n.translate('xpack.pnd.workflowTriggers.incidentClosed.description', {
    defaultMessage:
      'Emitted when a PND incident is contained (the containment human-in-the-loop gate is approved).',
  }),
  documentation: {
    details: i18n.translate('xpack.pnd.workflowTriggers.incidentClosed.documentation.details', {
      defaultMessage:
        'Emitted after the containment gate of the Watch Floor is resolved. The payload carries only ids and non-sensitive metadata (event.correlationId, event.incidentConversationId, event.watchId, event.spaceId), which you can use in trigger conditions.',
    }),
    examples: [
      i18n.translate('xpack.pnd.workflowTriggers.incidentClosed.documentation.example', {
        defaultMessage: `## Run only for incidents closed in a given space
\`\`\`yaml
triggers:
  - type: {triggerId}
    on:
      condition: 'event.spaceId: "default"'
\`\`\``,
        values: {
          triggerId: PND_INCIDENT_CLOSED_TRIGGER_ID,
        },
      }),
    ],
  },
};
