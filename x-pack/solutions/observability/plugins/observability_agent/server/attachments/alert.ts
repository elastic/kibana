/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import type { AttachmentTypeDefinition } from '@kbn/onechat-server/attachments';
import dedent from 'dedent';

const alertEntitiesSchema = z.object({
  'service.name': z.string().optional(),
  'service.environment': z.string().optional(),
  'transaction.type': z.string().optional(),
  'transaction.name': z.string().optional(),
  'host.name': z.string().optional(),
  'container.id': z.string().optional(),
  'kubernetes.pod.name': z.string().optional(),
});

const alertDataSchema = z.object({
  alert: z.object({
    ruleName: z.string().optional(),
    startedAt: z.string().optional(),
    reason: z.string().optional(),
    endedAt: z.string().optional(),
    status: z.enum(['active', 'recovered']).optional(),
  }),
  entities: alertEntitiesSchema,
  relatedSignals: z.string().optional(),
});

export type AlertAttachmentData = z.infer<typeof alertDataSchema>;

/**
 * Attachment type for Observability alerts.
 * - validate: enforces payload shape
 * - format: produces a concise representation for the LLM
 * - getAgentDescription: informs the agent how to treat this attachment
 */
export function createAlertAttachmentType(): AttachmentTypeDefinition<
  'observability.alert',
  AlertAttachmentData
> {
  return {
    id: 'observability.alert',
    validate: (input) => {
      const parsed = alertDataSchema.safeParse(input);
      if (parsed.success) {
        return { valid: true, data: parsed.data };
      }
      return { valid: false, error: parsed.error.message };
    },
    format: (attachment) => {
      const { alert, entities, relatedSignals } = attachment.data;
      const parts: string[] = [];
      if (alert.ruleName || alert.startedAt) {
        parts.push(
          `Alert: ${alert.ruleName ?? 'unknown rule'} | started_at: ${alert.startedAt ?? 'n/a'}`
        );
      }
      if (alert.status === 'recovered') {
        parts.push(`Status: recovered${alert.endedAt ? ` at ${alert.endedAt}` : ''}`);
      } else if (alert.status === 'active') {
        parts.push(`Status: active`);
      }
      const nonEmptyEntities = Object.entries(entities).filter(
        ([, v]) => typeof v === 'string' && v.length > 0
      );
      if (nonEmptyEntities.length) {
        parts.push(
          `Alert scope:\n${nonEmptyEntities.map(([k, v]) => `- ${k}: ${String(v)}`).join('\n')}`
        );
      }
      if (relatedSignals && relatedSignals.trim().length > 0) {
        parts.push(`Related signals:${relatedSignals}`);
      }
      const value = parts.join('\n');
      // console.log('value', value);
      return {
        getRepresentation: () => {
          return { type: 'text', value };
        },
      };
    },
    getTools: () => [],
    getAgentDescription: () =>
      dedent(
        `An Observability alert with alert scope and related signals to help explain and diagnose the incident.`
      ),
  };
}
