/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';

// ---------------------------------------------------------------------------
// MITRE ATT&CK threat shapes
//
// Copied verbatim from the design (rule-data-model.md "The shared detection
// fragment").  The .max() bounds are tight on purpose: they are what fits the
// 512 KB bounded-schema budget at the array maximums below.
// ---------------------------------------------------------------------------

export const threatTacticSchema = z
  .object({
    id: z.string().max(32),
    name: z.string().max(256),
    reference: z.string().max(512),
  })
  .strict();

export const threatSubtechniqueSchema = threatTacticSchema;

export const threatTechniqueSchema = z
  .object({
    id: z.string().max(32),
    name: z.string().max(256),
    reference: z.string().max(512),
    subtechnique: z.array(threatSubtechniqueSchema).max(3).optional(),
  })
  .strict();

export const threatEntrySchema = z
  .object({
    framework: z.string().max(64),
    tactic: threatTacticSchema,
    technique: z.array(threatTechniqueSchema).max(5).optional(),
  })
  .strict();

// ---------------------------------------------------------------------------
// Shared detection fragment
//
// A plain object of Zod shapes that each detection rule type spreads into its
// own z.object({ ...detectionRuleCommonFields, <type-specific fields> }).strict().
//
// Rules:
//   - No .default(), no .transform(), no .catch() — registration rejects them.
//   - Every object uses .strict().
//   - Every string and array is bounded.
//   - Twelve fields exactly as the data-model table specifies.
//
// Bounds for note and setup are raised here relative to the shared package:
//   - note: 65,536 (the framework's artifact string ceiling; the prebuilt
//     corpus already ships investigation guides of 29,075+ characters, making
//     the old 8,192 cap a migration blocker).
//   - setup: 16,384 (generous for setup guides, whose longest fixture runs to
//     ~1,500 characters).
//
// The shared package that kept the old 8,192 bounds for both was deleted in
// step B.10.  This copy is the authoritative source from B.8 forward.
//
// Ref: rule-data-model.md "The shared detection fragment"
//      rule-validation.md "No defaults, no transforms"
//      builder-type-registration-redesign.md "Long text fields and the string ceiling"
// ---------------------------------------------------------------------------

export const detectionRuleCommonFields = {
  severity: z.enum(['low', 'medium', 'high', 'critical']),
  risk_score: z.number().int().min(0).max(100),
  max_signals: z.number().int().min(1).max(10000).optional(),
  threat: z.array(threatEntrySchema).max(5).optional(),
  // Raised from 8,192 to 16,384: setup guides are short (longest fixture
  // ~1,500 chars), and 16,384 is generous headroom.
  setup: z.string().max(16384).optional(),
  // Raised from 8,192 to 65,536: a real prebuilt rule ships a 29,075-char
  // investigation guide, so 8,192 cannot hold the existing corpus.
  note: z.string().max(65536).optional(),
  references: z.array(z.string().max(1024)).max(32).optional(),
  false_positives: z.array(z.string().max(1024)).max(16).optional(),
  author: z.array(z.string().max(256)).max(16).optional(),
  license: z.string().max(256).optional(),
  related_integrations: z
    .array(
      z
        .object({
          package: z.string().max(64),
          version: z.string().max(32),
          integration: z.string().max(64).optional(),
        })
        .strict()
    )
    .max(16)
    .optional(),
  required_fields: z
    .array(
      z
        .object({
          name: z.string().max(128),
          type: z.string().max(64),
          ecs: z.boolean(),
        })
        .strict()
    )
    .max(32)
    .optional(),
};

// Derive DetectionRuleCommonFields by constructing a temporary strict schema
// and inferring from it.  The enrichment helper imports this type.
const _detectionRuleCommonSchema = z.object(detectionRuleCommonFields).strict();
export type DetectionRuleCommonFields = z.infer<typeof _detectionRuleCommonSchema>;
