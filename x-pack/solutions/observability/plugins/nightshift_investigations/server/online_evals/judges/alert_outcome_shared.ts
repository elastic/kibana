/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// Shared by the reference-based judges that grade a round against its alert's recovery outcome.

import { z, lazySchema } from '@kbn/zod/v4';

/** Generous bound on judge text; explanations are capped separately before persisting. */
export const MAX_JUDGE_TEXT_LENGTH = 100_000;

/** The judge cuts each input to this length, below the prompt bound so the truncation marker fits. */
export const MAX_JUDGE_INPUT_CHARS = 90_000;

// Unbounded on purpose: the schema is checked for the whole evaluation, so a rejection here would
// fail every evaluator in the set. `evaluate` truncates instead.
export const alertOutcomeReferenceDataSchema = lazySchema(() =>
  z.object({ alert_outcome: z.string() })
);

export type AlertOutcomeReferenceData = z.infer<typeof alertOutcomeReferenceDataSchema>;
