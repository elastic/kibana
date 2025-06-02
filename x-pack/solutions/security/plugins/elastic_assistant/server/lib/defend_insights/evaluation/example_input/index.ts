/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import { DefendInsight, Replacements } from '@kbn/elastic-assistant-common';

const Document = z.object({
  pageContent: z.string(),
  metadata: z.record(z.string(), z.any()),
});

export const ExampleDefendInsightsInput = z.object({
  insights: z.array(DefendInsight).nullable().optional(),
  prompt: z.string().optional(),
  anonymizedDocuments: z.array(Document).optional(),
  combinedGenerations: z.string().optional(),
  combinedRefinements: z.string().optional(),
  errors: z.array(z.string()).optional(),
  generationAttempts: z.number().optional(),
  generations: z.array(z.string()).optional(),
  hallucinationFailures: z.number().optional(),
  maxGenerationAttempts: z.number().optional(),
  maxHallucinationFailures: z.number().optional(),
  maxRepeatedGenerations: z.number().optional(),
  refinements: z.array(z.string()).optional(),
  refinePrompt: z.string().optional(),
  replacements: Replacements.optional(),
  unrefinedResults: z.array(DefendInsight).nullable().optional(),
});

/**
 * The optional overrides for an example input
 */
export const ExampleDefendInsightsInputWithOverrides = z.intersection(
  ExampleDefendInsightsInput,
  z.object({
    overrides: ExampleDefendInsightsInput.optional(),
  })
);

export type ExampleDefendInsightsInputWithOverrides = z.infer<
  typeof ExampleDefendInsightsInputWithOverrides
>;
