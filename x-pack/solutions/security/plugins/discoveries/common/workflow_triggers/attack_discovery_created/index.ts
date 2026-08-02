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
 * Globally unique, namespaced id for the Attack Discovery 2.0 "created" trigger.
 *
 * Emitted from both AD 2.0 write paths (the persist step and the scheduled
 * workflow executor). The Watch Floor Orchestrator subscribes to it to drive
 * the four-phase incident lifecycle.
 */
export const AttackDiscoveryCreatedTriggerId = 'security.attackDiscoveryCreated' as const;

/**
 * Event payload contract for {@link AttackDiscoveryCreatedTriggerId}.
 *
 * ⚠️ Deliberately carries **id and non-sensitive metadata only** — no
 * `summaryMarkdown` / `detailsMarkdown` / `title`. Trigger payloads land in
 * `execution.context` and the trigger-events log, which are readable by anyone
 * with workflows execution-read in the space — a weaker authorization model
 * than the Attack Discovery alerts index. Putting AD narrative content here
 * would be an information-disclosure finding. Subscribers fetch the content
 * later via the `_derive` route, which enforces the AD alerts index authz.
 *
 * `timestamp` and `eventChainDepth` are **engine-injected** and therefore
 * optional: the emitter provides only the content fields, and the workflow
 * execution engine enriches the event with `timestamp`, `spaceId` and
 * `eventChainDepth` before validating (see
 * `workflows_execution_engine/server/trigger_events/trigger_event_handler.ts`).
 * They are declared so the strict schema accepts the enriched event while still
 * rejecting unknown fields such as AD narrative content.
 */
export const attackDiscoveryCreatedEventSchema = z
  .object({
    alertIds: z.array(z.string()).describe(
      i18n.translate('xpack.discoveries.workflowTriggers.attackDiscoveryCreated.schema.alertIds', {
        defaultMessage: 'The ids of the source alerts that contributed to this attack discovery.',
      })
    ),
    attackDiscoveryAlertId: z.string().describe(
      i18n.translate(
        'xpack.discoveries.workflowTriggers.attackDiscoveryCreated.schema.attackDiscoveryAlertId',
        {
          defaultMessage: 'The id of the attack discovery alert that was created.',
        }
      )
    ),
    eventChainDepth: z
      .number()
      .optional()
      .describe(
        i18n.translate(
          'xpack.discoveries.workflowTriggers.attackDiscoveryCreated.schema.eventChainDepth',
          {
            defaultMessage:
              'Engine-injected event-chain depth. Added by the workflow execution engine before validation; use to guard against unbounded event chains.',
          }
        )
      ),
    generationUuid: z.string().describe(
      i18n.translate(
        'xpack.discoveries.workflowTriggers.attackDiscoveryCreated.schema.generationUuid',
        {
          defaultMessage:
            'The unique identifier of the generation run that produced this discovery.',
        }
      )
    ),
    riskScore: z
      .number()
      .optional()
      .describe(
        i18n.translate(
          'xpack.discoveries.workflowTriggers.attackDiscoveryCreated.schema.riskScore',
          {
            defaultMessage: 'Optional risk score associated with the attack discovery.',
          }
        )
      ),
    spaceId: z.string().describe(
      i18n.translate('xpack.discoveries.workflowTriggers.attackDiscoveryCreated.schema.spaceId', {
        defaultMessage: 'The space the attack discovery was created in.',
      })
    ),
    timestamp: z
      .string()
      .optional()
      .describe(
        i18n.translate(
          'xpack.discoveries.workflowTriggers.attackDiscoveryCreated.schema.timestamp',
          {
            defaultMessage:
              'Engine-injected ISO timestamp of when the event was emitted. Added by the workflow execution engine before validation.',
          }
        )
      ),
  })
  .strict();

/**
 * The enriched, engine-validated event for {@link AttackDiscoveryCreatedTriggerId}.
 */
export type AttackDiscoveryCreatedEvent = z.infer<typeof attackDiscoveryCreatedEventSchema>;

/**
 * Common (server + agent catalog) definition for the Attack Discovery 2.0
 * "created" trigger. Registered on the server via
 * `workflowsExtensions.registerTriggerDefinition(...)`.
 */
export const attackDiscoveryCreatedTriggerCommonDefinition: CommonTriggerDefinition = {
  id: AttackDiscoveryCreatedTriggerId,
  stability: 'tech_preview',
  eventSchema: attackDiscoveryCreatedEventSchema,
  title: i18n.translate('xpack.discoveries.workflowTriggers.attackDiscoveryCreated.title', {
    defaultMessage: 'Attack Discovery created',
  }),
  description: i18n.translate(
    'xpack.discoveries.workflowTriggers.attackDiscoveryCreated.description',
    {
      defaultMessage:
        'Emitted when Attack Discovery 2.0 creates a new attack discovery alert in the same space. Use to drive incident-response workflows. The payload carries the discovery id and non-sensitive metadata only; fetch the discovery content in a later step.',
    }
  ),
  documentation: {
    details: i18n.translate(
      'xpack.discoveries.workflowTriggers.attackDiscoveryCreated.documentation.details',
      {
        defaultMessage:
          'Emitted after Attack Discovery 2.0 persists a new attack discovery. The event includes `attackDiscoveryAlertId`, `alertIds`, `generationUuid`, an optional `riskScore`, and `spaceId`. It deliberately excludes the discovery narrative (summary, details, title): fetch that content in a workflow step using `attackDiscoveryAlertId`. Use KQL in `on.condition` to filter, for example by `riskScore`.',
      }
    ),
    examples: [
      i18n.translate(
        'xpack.discoveries.workflowTriggers.attackDiscoveryCreated.documentation.exampleBasic',
        {
          defaultMessage: `## Run for every new attack discovery
\`\`\`yaml
triggers:
  - type: {triggerId}
steps:
  - name: log_discovery
    type: elasticsearch.index
    with:
      index: attack-discovery-events
      body:
        attack_discovery_alert_id: "{eventAttackDiscoveryAlertId}"
        space_id: "{eventSpaceId}"
        timestamp: "{eventTimestamp}"
\`\`\``,
          values: {
            eventAttackDiscoveryAlertId: '{{event.attackDiscoveryAlertId}}',
            eventSpaceId: '{{event.spaceId}}',
            eventTimestamp: '{{event.timestamp}}',
            triggerId: AttackDiscoveryCreatedTriggerId,
          },
        }
      ),
      i18n.translate(
        'xpack.discoveries.workflowTriggers.attackDiscoveryCreated.documentation.exampleFilterRiskScore',
        {
          defaultMessage: `## Only run for high-risk discoveries
\`\`\`yaml
triggers:
  - type: {triggerId}
    on:
      condition: event.riskScore >= 70
\`\`\``,
          values: { triggerId: AttackDiscoveryCreatedTriggerId },
        }
      ),
    ],
  },
};
