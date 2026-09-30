/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { detectionRuleCommonFields } from './detection_rule_common_fields';

// ---------------------------------------------------------------------------
// Schema
//
// The complete builder_fields shape for security.detection.query:
// the shared detection fragment spread in, plus three type-specific fields.
//
// No defaults, no transforms — see rule-validation.md "No defaults, no transforms".
//
// Ref: rule-data-model.md "security.detection.query"
// ---------------------------------------------------------------------------

export const customQueryBuilderFieldsSchema = z
  .object({
    ...detectionRuleCommonFields,
    index: z.array(z.string().min(1).max(256)).min(1).max(32),
    query: z.string().min(1).max(8192),
    language: z.enum(['kuery', 'lucene']),
  })
  .strict();

export type CustomQueryBuilderFields = z.infer<typeof customQueryBuilderFieldsSchema>;
