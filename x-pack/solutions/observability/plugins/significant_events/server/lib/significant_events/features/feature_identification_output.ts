/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { INFERRED_FEATURE_TYPES } from '@kbn/significant-events-schema';

const equalityConditionSchema = z
  .object({
    field: z.string().min(1),
    eq: z.string(),
  })
  .strict();

const featureFilterSchema = z.union([
  equalityConditionSchema,
  z
    .object({
      and: z.array(equalityConditionSchema).min(1),
    })
    .strict(),
  z
    .object({
      or: z.array(equalityConditionSchema).min(1),
    })
    .strict(),
]);

const nonEmptyRecordSchema = z
  .record(z.string(), z.unknown())
  .refine((value) => Object.keys(value).length > 0, {
    message: 'At least one property is required',
  });

const featureItemSchema = z
  .object({
    id: z.string(),
    type: z.enum(INFERRED_FEATURE_TYPES),
    subtype: z.string(),
    description: z.string(),
    title: z.string(),
    properties: nonEmptyRecordSchema,
    confidence: z.number().min(0).max(100),
    evidence: z.array(z.string()),
    evidence_doc_ids: z.array(z.string()).optional(),
    tags: z.array(z.string()),
    filter: featureFilterSchema
      .optional()
      .describe('Optional single equality filter or one-level and/or list of equality filters.'),
    meta: z.record(z.string(), z.unknown()).optional(),
  })
  .passthrough();

const ignoredFeatureItemSchema = z
  .object({
    feature_id: z.string(),
    feature_title: z.string(),
    excluded_feature_id: z.string(),
    reason: z.string(),
  })
  .passthrough();

export const featureIdentificationOutputSchema = z
  .object({
    features: z
      .array(featureItemSchema)
      .describe(
        'Deduplicated list of features identified from the current sample documents. Include every feature supported by evidence at confidence ≥ 30.'
      ),
    ignored_features: z
      .array(ignoredFeatureItemSchema)
      .optional()
      .default([])
      .describe(
        'Features suppressed because they match an excluded feature. Empty array when no exclusions apply.'
      ),
  })
  .describe(
    'The complete deduplicated feature identification result for the current sample documents. Produce it exactly once, after all grounding searches and duplicate checks are complete.'
  );

export type FeatureIdentificationOutput = z.infer<typeof featureIdentificationOutputSchema>;
