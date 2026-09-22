/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import type { AttachmentTypeDefinition } from '@kbn/agent-builder-server/attachments';
import { SecurityAgentBuilderAttachments } from '../../../common/constants';
import { securityAttachmentDataSchema } from './security_attachment_data_schema';

/** Maximum number of entities in one attachment; the Worker must cap and set truncated=true. */
export const MAX_IMPACTED_ENTITIES = 50;

/**
 * Accepts a native number or a Liquid `{{ }}` numeric string (e.g. `"3"`).
 * Rejects JS-coercible junk (`null`, `true`/`false`, `""`) that `z.coerce.number()` would
 * silently turn into 0/1.
 */
const liquidNonNegativeInt = z.union([
  z.number().int().min(0).max(100_000),
  z
    .string()
    .regex(/^\d+$/, 'Expected a non-negative integer string')
    .transform((value) => Number(value))
    .pipe(z.number().int().min(0).max(100_000)),
]);

const impactVerdictCountsSchema = z.object({
  // Liquid {{ }} yields strings; only ${{ }} preserves numbers. Use liquidNonNegativeInt
  // (not z.coerce.number) so blank/boolean/null fail validation instead of becoming 0/1.
  true_positive: liquidNonNegativeInt.default(0),
  false_positive: liquidNonNegativeInt.default(0),
  inconclusive: liquidNonNegativeInt.default(0),
});

const impactedEntitySchema = z
  .object({
    entity_type: z.enum(['host', 'user']),
    /** 'unknown' is a real value emitted by the sub-workflow when the alert lacked the field. */
    name: z.string().min(1).max(1024),
    alert_count: liquidNonNegativeInt,
    verdicts: impactVerdictCountsSchema,
  })
  .superRefine((entity, ctx) => {
    const verdictSum =
      entity.verdicts.true_positive + entity.verdicts.false_positive + entity.verdicts.inconclusive;
    if (verdictSum !== entity.alert_count) {
      ctx.addIssue({
        code: 'custom',
        message: `verdict counts (${verdictSum}) must equal alert_count (${entity.alert_count})`,
        path: ['verdicts'],
      });
    }
  });

export type ImpactedEntity = z.infer<typeof impactedEntitySchema>;

export const impactAttachmentDataSchema = securityAttachmentDataSchema
  .extend({
    entities: z.array(impactedEntitySchema).max(MAX_IMPACTED_ENTITIES),
    total_alert_count: liquidNonNegativeInt.optional(),
    /** True when the entity list was capped to MAX_IMPACTED_ENTITIES before attaching.
     *  Accepts native boolean or the Liquid-rendered strings "true"/"false". */
    truncated: z
      .union([z.boolean(), z.enum(['true', 'false']).transform((v) => v === 'true')])
      .optional(),
  })
  .superRefine((data, ctx) => {
    if (data.total_alert_count === undefined) {
      return;
    }
    for (const entity of data.entities) {
      if (data.total_alert_count < entity.alert_count) {
        ctx.addIssue({
          code: 'custom',
          message: `total_alert_count (${data.total_alert_count}) must be >= each entity alert_count`,
          path: ['total_alert_count'],
        });
        return;
      }
    }
  });

export type ImpactAttachmentData = z.infer<typeof impactAttachmentDataSchema>;

const formatForAgent = (data: ImpactAttachmentData): string => {
  if (!data.entities?.length) {
    return 'Alert impact summary\nNo impacted entities recorded.';
  }

  const lines: string[] = ['Alert impact summary'];
  for (const { entity_type, name, alert_count, verdicts } of data.entities) {
    lines.push(
      `${entity_type} ${name}: ${alert_count} alert(s) — ${verdicts.true_positive} TP, ${verdicts.false_positive} FP, ${verdicts.inconclusive} inconclusive`
    );
  }
  if (data.truncated) {
    lines.push(`(list truncated to ${MAX_IMPACTED_ENTITIES} entities)`);
  }
  return lines.join('\n');
};

/** Creates the definition for the `security.impact` attachment type. */
export const createImpactAttachmentType = (): AttachmentTypeDefinition => ({
  id: SecurityAgentBuilderAttachments.impact,
  validate: (input) => {
    const result = impactAttachmentDataSchema.safeParse(input);
    if (result.success) {
      return { valid: true, data: result.data };
    }
    return { valid: false, error: result.error.message };
  },
  format: (attachment) => ({
    getRepresentation: () => ({
      type: 'text',
      value: formatForAgent(attachment.data as ImpactAttachmentData),
    }),
  }),
  getAgentDescription: () =>
    `A ${SecurityAgentBuilderAttachments.impact} attachment summarises which hosts and users were touched by the alert batch the Alert Triage Worker analysed, with per-entity verdict counts.

Each item in \`entities\` carries:
- entity_type: "host" | "user"
- name: hostname or username ("unknown" when the alert lacked the field)
- alert_count: number of alerts attributed to this entity
- verdicts: { true_positive, false_positive, inconclusive }

When \`truncated\` is true the list was capped at ${MAX_IMPACTED_ENTITIES} entities; \`total_alert_count\` gives the full alert count before truncation.`,
});
