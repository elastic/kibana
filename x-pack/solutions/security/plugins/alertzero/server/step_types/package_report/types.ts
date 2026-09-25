/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ActionCatalogEntry } from '@kbn/alertzero-common';
import type { PackageReportMintPayload } from '../../../common/step_types/package_report';

/** One host observed on the current-run SSE, with enrollment resolution applied. */
export interface CurrentRunHost {
  name: string;
  /** Elastic Defend agent id when enrolled; absent when unenrolled or unknown. */
  agentId?: string;
  enrolled: boolean;
}

/** Process selector fillable into kill/suspend `parameters`. */
export interface ProcessSelector {
  pid?: number;
  entityId?: string;
  /** Stable key for the subject uuidv5 when process-scoped. */
  processKey: string;
}

/**
 * Staged current-run Investigation state packaging reads. Scoped by `runId`;
 * never accumulated attachments from prior runs.
 */
export interface CurrentRunState {
  runId: string;
  reportId: string;
  /** True when at least one current-run SSE has `hunt_result.has_confirmed_hit`. */
  hasConfirmedHit: boolean;
  /** SSE titles for the closure summary. */
  titles: string[];
  /** Short evidence lines for the closure summary. */
  evidenceLines: string[];
  /** Technique ids from current-run SKIs (`type: technique`). */
  techniques: string[];
  hosts: CurrentRunHost[];
  /**
   * Process selectors already rehydrated from current-run alerts/events.
   * Empty means kill/suspend cannot be filled.
   */
  processSelectors: ProcessSelector[];
}

export type CatalogListResult =
  | { ok: true; actions: ActionCatalogEntry[] }
  | { ok: false; reason: 'catalog_error' };

export type CoverageSkipReason = 'disabled' | 'denied' | 'storage_failure' | 'already_processed';

export interface CoverageSubject {
  kiId: string;
  subject: string;
  technique?: string;
  title: string;
  description: string;
  content: string;
}

export interface CoverageWriteResult {
  written: Array<{ kiId: string; subject: string }>;
  skipped: Array<{ kiId: string; subject: string; reason: CoverageSkipReason }>;
}

export interface DecidePackageReportResult {
  dismiss: boolean;
  proposals: PackageReportMintPayload[];
  closureSummary: string;
}
