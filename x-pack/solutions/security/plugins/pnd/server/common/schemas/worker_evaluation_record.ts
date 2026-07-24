/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// Spike-canonical Daybreak contract shapes. PND-local compatible copy until
// #17942 ratifies. Matches daybreak-spike server/common/schemas field names.

import { z } from '@kbn/zod/v4';
import { DAYBREAK_WORKER_EVAL_SCHEMA_VERSION, DEFAULT_PND_WORKER_ID } from './versions';

/**
 * Model/token/latency/cost provenance block (E&T requirement).
 * costBasis is 'list-price' | 'self-hosted' | 'unknown' so an unverified
 * cost never masquerades as authoritative.
 */
export const provenanceSchema = z.object({
  modelId: z.string(),
  connectorId: z.string(),
  latencyMs: z.number().nonnegative(),
  inputTokens: z.number().int().nonnegative().optional(),
  outputTokens: z.number().int().nonnegative().optional(),
  totalTokens: z.number().int().nonnegative().optional(),
  costUsd: z.number().nonnegative().optional(),
  costBasis: z.enum(['list-price', 'self-hosted', 'unknown']).default('unknown'),
});
export type Provenance = z.infer<typeof provenanceSchema>;

/**
 * Exactly one WorkerEvaluationRecord per worker run (no parallel store — the
 * canonical record E&T scores against the golden dataset).
 */
export const workerEvaluationRecordSchema = z.object({
  id: z.string(),
  schemaVersion: z.string(),
  workerId: z.string(),
  watch: z.enum([
    'watch-floor',
    'watch-officer',
    'watch-dark',
    'watch-deep',
    'watch-detection',
    'watch-ad',
  ]),
  investigationId: z.string(),
  runId: z.string(),
  verdict: z.string(),
  confidence: z.number().min(0).max(1),
  proposalId: z.string().optional(),
  evidenceRefs: z.array(z.string()).default([]),
  provenance: provenanceSchema,
  createdAt: z.string(),
});
export type WorkerEvaluationRecord = z.infer<typeof workerEvaluationRecordSchema>;

export interface BuildWorkerEvalArgs {
  id: string;
  workerId?: string;
  watch: WorkerEvaluationRecord['watch'];
  investigationId: string;
  runId: string;
  verdict: string;
  confidence: number;
  proposalId?: string;
  evidenceRefs?: string[];
  provenance: Provenance;
}

export const buildWorkerEvaluationRecord = (args: BuildWorkerEvalArgs): WorkerEvaluationRecord =>
  workerEvaluationRecordSchema.parse({
    id: args.id,
    schemaVersion: DAYBREAK_WORKER_EVAL_SCHEMA_VERSION,
    workerId: args.workerId ?? DEFAULT_PND_WORKER_ID,
    watch: args.watch,
    investigationId: args.investigationId,
    runId: args.runId,
    verdict: args.verdict,
    confidence: args.confidence,
    proposalId: args.proposalId,
    evidenceRefs: args.evidenceRefs ?? [],
    provenance: provenanceSchema.parse(args.provenance),
    createdAt: new Date().toISOString(),
  });
