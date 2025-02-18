/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AttackDiscovery, Replacements } from '@kbn/elastic-assistant-common';
import { z } from '@kbn/zod';

const Document = z.object({
  pageContent: z.string(),
  metadata: z.record(z.string(), z.any()),
});

type Document = z.infer<typeof Document>;

/**
 * Parses the input from an example in a LangSmith dataset
 */
export const ExampleInput = z.object({
  attackDiscoveries: z.array(AttackDiscovery).nullable().optional(),
  attackDiscoveryPrompt: z.string().optional(),
  anonymizedAlerts: z.array(Document).optional(),
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
  unrefinedResults: z.array(AttackDiscovery).nullable().optional(),
});

export type ExampleInput = z.infer<typeof ExampleInput>;

/**
 * The optional overrides for an example input
 */
export const ExampleInputWithOverrides = z.intersection(
  ExampleInput,
  z.object({
    overrides: ExampleInput.optional(),
  })
);

export type ExampleInputWithOverrides = z.infer<typeof ExampleInputWithOverrides>;
