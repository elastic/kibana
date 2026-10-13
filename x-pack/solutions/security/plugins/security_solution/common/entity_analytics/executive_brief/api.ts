/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Entity } from '@kbn/entity-store/common';
import { z, lazySchema } from '@kbn/zod/v4';
import type { Brief, VerificationSummary } from './brief';
import { BRIEF_RANGES } from './constants';
import type { BriefRange } from './constants';
import type { BriefErrorCode, BriefJobStage, BriefJobStatus } from './document';
import type { Fact, SignalRun } from './evidence';

/** Request body for generating a brief; the time window is computed server-side from `range`. */
export const generateBriefRequestBodySchema = lazySchema(() =>
  z.object({
    range: z.enum(BRIEF_RANGES),
    connectorId: z.string().min(1).max(256).optional(),
  })
);

export type GenerateBriefRequestBody = z.infer<typeof generateBriefRequestBodySchema>;

/** The latest run; it can be newer than the report (running or failed). */
export interface BriefJobView {
  id: string;
  status: BriefJobStatus;
  /** Only while running. */
  stage?: BriefJobStage;
  startedAt: string;
  /** The last heartbeat. */
  updatedAt: string;
  /**
   * Milliseconds from `startedAt` to `updatedAt`; only when succeeded or failed. For a job read as
   * interrupted (no recent heartbeat), it runs to the last heartbeat.
   */
  took?: number;
  /** Only when failed. */
  error?: { code: BriefErrorCode; message: string };
}

/** GET status response: the latest job alone, for polling. */
export type BriefStatusResponse = BriefJobView;

/** POST response: the started (or reused) job. */
export interface GenerateBriefResponse {
  job: Pick<BriefJobView, 'id' | 'status' | 'stage'>;
  /** True when an existing running job was returned instead of starting a new one. */
  reused: boolean;
}

/**
 * Everything needed to render the brief; `verdict` and `assessments` are absent when nothing was
 * found.
 */
export interface BriefReport {
  verdict?: Brief['verdict'];
  assessments?: Brief['assessments'];
  /** Entity Store records of the entities the facts reference, keyed by EUID. */
  entities: Record<string, Entity>;
  facts: Fact[];
}

/** About the report; `tokens` and `verification` are absent when the AI wasn't called. */
export interface BriefMetadata {
  generatedAt: string;
  expiresAt: string;
  period: { range: BriefRange; from: string; to: string };
  connectorId: string;
  model?: string;
  tokens?: { prompt: number; completion: number; total: number };
  verification?: VerificationSummary;
  /** How each signal's run went, keyed by signal id. */
  signals: Record<string, SignalRun>;
}

/** GET response. `report` and `metadata` are present together, once a run has succeeded. */
export interface BriefResponse {
  job: BriefJobView;
  report?: BriefReport;
  metadata?: BriefMetadata;
}
