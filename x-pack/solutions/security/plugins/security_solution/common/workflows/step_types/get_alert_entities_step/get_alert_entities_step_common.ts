/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { StepCategory } from '@kbn/workflows';
import type { BaseStepDefinition } from '@kbn/workflows';
import { i18n } from '@kbn/i18n';
import { MAX_ALERT_ID_LENGTH, MAX_ALERT_IDS } from '../common/constants';

export const GetAlertEntitiesStepId = 'security.getAlertEntities' as const;

export const ALERT_ENTITY_TYPES = ['host', 'user', 'service'] as const;

export const DEFAULT_ALERT_ENTITY_TYPES: Array<(typeof ALERT_ENTITY_TYPES)[number]> = [
  'host',
  'user',
];

export const DEFAULT_MAX_ENTITIES = 50;
export const MAX_ENTITIES = 100;

/**
 * Mirrors the limits on an Investigation impact entity (`impactEntitySchema` in the
 * agenticInvestigations plugin), so the entities this step returns can be handed to
 * `investigations.attachImpact` as they are. Duplicated rather than imported because
 * this is shared with the browser.
 */
export const MAX_ALERT_ENTITY_ID_LENGTH = 256;
export const MAX_ALERT_ENTITY_NAME_LENGTH = 512;

export const getAlertEntitiesInputSchema = z.object({
  alert_ids: z
    .array(z.string().min(1).max(MAX_ALERT_ID_LENGTH))
    .min(1)
    .max(MAX_ALERT_IDS)
    .describe('IDs of the detection alerts, in the current space, to resolve entities from'),
  entity_types: z
    .array(z.enum(ALERT_ENTITY_TYPES))
    .min(1)
    .max(ALERT_ENTITY_TYPES.length)
    // A repeated type would return each of its entities twice and double count the total.
    .refine((entityTypes) => new Set(entityTypes).size === entityTypes.length, {
      message: 'entity_types must not repeat a type',
    })
    .optional()
    .default(DEFAULT_ALERT_ENTITY_TYPES)
    .describe('Entity types to resolve (default: host, user)'),
  max_entities: z.coerce
    .number()
    .finite()
    .int()
    .min(1)
    .max(MAX_ENTITIES)
    .optional()
    .default(DEFAULT_MAX_ENTITIES)
    .describe(
      `The most entities to return, most-alerted first (default: ${DEFAULT_MAX_ENTITIES}, max: ${MAX_ENTITIES})`
    ),
});

export const getAlertEntitiesOutputSchema = z.object({
  entities: z
    .array(
      z.object({
        id: z.string().min(1).max(MAX_ALERT_ENTITY_ID_LENGTH).describe('Entity Store entity id'),
        type: z.enum(ALERT_ENTITY_TYPES),
        name: z
          .string()
          .min(1)
          .max(MAX_ALERT_ENTITY_NAME_LENGTH)
          .optional()
          .describe(
            'Display name, taken from the entity’s most recent alert; absent if it has none'
          ),
      })
    )
    .describe('The entities, most-alerted first, ties broken by id'),
  total: z.number().int().describe('How many distinct entities the alerts reference'),
  truncated: z.boolean().describe('Whether `entities` holds fewer than `total`'),
});

export const getAlertEntitiesStepCommonDefinition: BaseStepDefinition<
  typeof getAlertEntitiesInputSchema,
  typeof getAlertEntitiesOutputSchema
> = {
  id: GetAlertEntitiesStepId,
  label: i18n.translate('xpack.securitySolution.workflows.steps.getAlertEntities.label', {
    defaultMessage: 'Get Alert Entities',
  }),
  description: i18n.translate(
    'xpack.securitySolution.workflows.steps.getAlertEntities.description',
    {
      defaultMessage:
        'Resolves the hosts, users, and services that a set of detection alerts are about, as Entity Store entity ids with display names.',
    }
  ),
  category: StepCategory.KibanaSecurity,
  inputSchema: getAlertEntitiesInputSchema,
  outputSchema: getAlertEntitiesOutputSchema,
  stability: 'tech_preview',
  documentation: {
    details: i18n.translate(
      'xpack.securitySolution.workflows.steps.getAlertEntities.documentation.details',
      {
        defaultMessage:
          'Derives each alert’s entity ids with the Entity Store’s own identity rules, so the ids are the same whether or not the Entity Store is installed in the space. Ids are derived the way detection stamps them: for example, a failed-login alert has no user. Entities are ranked by how many of the alerts reference them, and each takes its display name from the most recent of those alerts. The output can be passed to investigations.attachImpact as it is, when it is not empty.',
      }
    ),
    examples: [
      `## Record the hosts and users behind some alerts as an Investigation's impact
\`\`\`yaml
- name: get_alert_entities
  type: security.getAlertEntities
  with:
    alert_ids: "\${{ inputs.alert_ids }}"
    max_entities: 20

# investigations.attachImpact rejects an empty list, which alerts with no host or user produce.
- name: attach_impact
  type: investigations.attachImpact
  if: "\${{ steps.get_alert_entities.output.entities != blank }}"
  with:
    conversationId: "{{ inputs.conversationId }}"
    entities: "\${{ steps.get_alert_entities.output.entities }}"
\`\`\``,
    ],
  },
};
