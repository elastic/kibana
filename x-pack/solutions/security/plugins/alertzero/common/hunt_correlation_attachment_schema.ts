/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { alertZeroAttachmentDataSchema } from './attachment_data_schema';
import { DIAMOND_VERTICES } from './attachment_enums';

export const anchorSchema = z.object({
  kind: z.enum(['hash', 'ioc_set_hash', 'actor']),
  value: z.string().min(1).max(2048),
});

export const diamondScoreSchema = z.object({
  vertex: z.enum(DIAMOND_VERTICES),
  related_report_id: z.string().min(1).max(512),
  score: z.number().min(0).max(1),
});

export const thresholdsSchema = z.object({
  anchor_match: z.number().min(0).max(1),
  diamond_vertex: z.number().min(0).max(1),
});

/**
 * Report-to-report correlation evidence.
 *
 * Note: `diamond_scores` is capped at 100 rows, not the usual 50, a deliberate exception
 * because each report can score against up to four Diamond Model vertices per related report.
 */
export const huntCorrelationAttachmentDataSchema = alertZeroAttachmentDataSchema.extend({
  anchors: z.array(anchorSchema).max(50),
  // One score per (related report, vertex). The renderer keys the table by that pair and the
  // header badge evaluates every row against the threshold, so a duplicate pair would let the
  // table show one value while the badge judged another. These payloads are machine-generated,
  // so a duplicate means a producer bug rather than input to reconcile.
  diamond_scores: z
    .array(diamondScoreSchema)
    .max(100)
    .refine(
      (scores) =>
        new Set(scores.map((score) => `${score.related_report_id}:${score.vertex}`)).size ===
        scores.length,
      { message: 'diamond_scores must not repeat a (related_report_id, vertex) pair' }
    ),
  thresholds: thresholdsSchema,
  self_match_excluded: z.literal(true),
  report_revision: z.string().min(1).max(256).optional(),
});

export type HuntCorrelationAttachmentData = z.infer<typeof huntCorrelationAttachmentDataSchema>;
