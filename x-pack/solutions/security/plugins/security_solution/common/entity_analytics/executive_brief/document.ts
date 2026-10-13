/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Brief, VerificationSummary } from './brief';
import type { BriefRange } from './constants';
import type { Evidence } from './evidence';

export type BriefJobStatus = 'pending' | 'running' | 'succeeded' | 'failed';
export type BriefJobStage = 'gather' | 'compose' | 'verify';

export type BriefErrorCode =
  | 'interrupted'
  | 'timeout'
  | 'no_connector'
  | 'llm_error'
  | 'llm_output'
  | 'internal';

export interface BriefJob {
  id: string;
  status: BriefJobStatus;
  stage?: BriefJobStage;
  started_at: string;
  /** The last stage change, or the finish time. */
  updated_at?: string;
  error?: { code: BriefErrorCode; message: string };
}

export interface BriefParams {
  range: BriefRange;
  from: string;
  to: string;
  connector_id: string;
}

/**
 * One document per (owner, space). The job fields track the latest run; the brief fields
 * hold the last successful brief and are replaced only when a job succeeds. A succeeded job
 * without `brief` found nothing: `evidence.signals` says what was checked.
 */
export interface BriefDocument {
  schema_version: 1;
  /** Stable principal id of the owner; the caller is always the owner. */
  owner: { id: string };
  space_id: string;
  job: BriefJob;
  generated_at?: string;
  expires_at: string;
  params?: BriefParams;
  model?: string;
  tokens?: { prompt: number; completion: number; total: number };
  evidence?: Evidence;
  brief?: Brief;
  verification?: VerificationSummary;
}
