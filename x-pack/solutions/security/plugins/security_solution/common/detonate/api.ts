/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';

/** Task ids are UUIDs, so the route accepts nothing else. */
const taskId = z.string().uuid();

/**
 * Anonymization fields forwarded from the assistant settings. Bounded so a request cannot force
 * unbounded work on the anonymizer.
 */
const anonymizationField = z.object({
  id: z.string().max(256),
  field: z.string().max(256),
  allowed: z.boolean().optional(),
  anonymized: z.boolean().optional(),
});

export const DetonateAiSummaryRequestBody = z.object({
  taskId,
  connectorId: z.string().max(256),
  anonymizationFields: z.array(anonymizationField).max(500).default([]),
});

export type DetonateAiSummaryRequestBodyType = z.infer<typeof DetonateAiSummaryRequestBody>;

export interface DetonateAiSummaryResponse {
  /** Anonymized context describing the detonation, passed to the model as the user input. */
  context: Record<string, unknown>;
  /** Anonymization replacements, so the UI can map placeholders back to real values. */
  replacements: Record<string, string>;
  /** System prompt for the summary. */
  prompt: string;
}
