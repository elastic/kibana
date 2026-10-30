/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { lazySchema, z } from '@kbn/zod/v4';
import { StepCategory } from '@kbn/workflows';
import type { BaseStepDefinition } from '@kbn/workflows';
import { i18n } from '@kbn/i18n';
import { MAX_ALERT_ID_LENGTH, MAX_ALERT_IDS } from '../common/constants';

export const MatchAttackFingerprintsStepId = 'security.matchAttackFingerprints' as const;

const attackFields = () => ({
  attack_discovery_id: z.string().max(512),
  title: z.string().max(1024),
  alert_ids: z.array(z.string().max(MAX_ALERT_ID_LENGTH)).max(MAX_ALERT_IDS),
  summary_markdown: z.string().max(8000),
});

export const matchAttackFingerprintsInputSchema = lazySchema(() =>
  z.object({
    attacks: z
      .array(z.record(z.string(), z.unknown()))
      .max(2000)
      .describe('Persisted Attack Discovery documents from one worker run'),
    parent_run_id: z
      .string()
      .max(128)
      .optional()
      .describe('Workflow execution id of the worker run, stored on a new fingerprint'),
  })
);

export const matchAttackFingerprintsOutputSchema = lazySchema(() =>
  z.object({
    reviews: z
      .array(
        z.object({
          ...attackFields(),
          related_investigation_id: z.string().max(256),
          related_link_reason: z.string().max(32),
          sibling_alert_ids: z.array(z.string().max(MAX_ALERT_ID_LENGTH)).max(MAX_ALERT_IDS),
          sibling_attack_discovery_ids: z.array(z.string().max(512)).max(MAX_ALERT_IDS),
        })
      )
      .describe('Attacks that open an Investigation and run FP/TP analysis'),
    attachments: z
      .array(
        z.object({
          ...attackFields(),
          investigation_id: z.string().max(256),
          journal_alerts_retired: z.boolean(),
          tag_correlated_alerts: z.boolean(),
          tag_fp_chain_alerts: z.boolean(),
          fingerprint_pending: z.boolean(),
          own_fingerprint_id: z
            .string()
            .max(128)
            .optional()
            .describe(
              'Fingerprint id for a review this attach starts after the Investigation changed'
            ),
          host_entity_ids: z.array(z.string().max(512)).max(100).optional(),
          user_entity_ids: z.array(z.string().max(512)).max(100).optional(),
          entity_pairs: z.array(z.string().max(1024)).max(100).optional(),
          tactics: z.array(z.string().max(64)).max(100).optional(),
          first_alert_at: z.string().max(64).optional(),
          last_alert_at: z.string().max(64).optional(),
          expires_at: z.string().max(64).optional(),
        })
      )
      .describe('Attacks joined to an Investigation that already exists or is opened by a sibling'),
  })
);

export const matchAttackFingerprintsStepCommonDefinition: BaseStepDefinition<
  typeof matchAttackFingerprintsInputSchema,
  typeof matchAttackFingerprintsOutputSchema
> = {
  id: MatchAttackFingerprintsStepId,
  label: i18n.translate('xpack.securitySolution.workflows.steps.matchAttackFingerprints.label', {
    defaultMessage: 'Match attack fingerprints',
  }),
  description: i18n.translate(
    'xpack.securitySolution.workflows.steps.matchAttackFingerprints.description',
    {
      defaultMessage:
        'Groups attacks from one run and matches them to stored attack fingerprints so a duplicate joins the existing Investigation.',
    }
  ),
  category: StepCategory.KibanaSecurity,
  inputSchema: matchAttackFingerprintsInputSchema,
  outputSchema: matchAttackFingerprintsOutputSchema,
  stability: 'tech_preview',
  documentation: {
    details: i18n.translate(
      'xpack.securitySolution.workflows.steps.matchAttackFingerprints.documentation.details',
      {
        defaultMessage:
          'Clusters the attacks in memory, then searches unexpired fingerprints by host, user, and alert id. A match attaches to that Investigation and skips FP/TP analysis. A new canonical attack is written as a fingerprint so the next run can find it.',
      }
    ),
    examples: [
      `## Split a worker run into reviews and attachments
\`\`\`yaml
- name: match_fingerprints
  type: security.matchAttackFingerprints
  with:
    attacks: "\${{ steps.resolve_fanout.output.attacks }}"
    parent_run_id: "{{ execution.id }}"
\`\`\``,
    ],
  },
};
