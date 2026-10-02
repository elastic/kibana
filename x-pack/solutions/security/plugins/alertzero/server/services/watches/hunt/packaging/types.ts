/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ActionCatalogEntry } from '@kbn/alertzero-common';
import type { PackageReportMintPayload } from '../../../../../common/step_types/package_report';

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
  /**
   * host.name (or host.hostname) of the document the selector came from. A
   * selector is only ever applied to the agent of the host it was observed
   * on, never fanned out to every enrolled host.
   */
  hostName: string;
  /** e.g. `powershell.exe`; drives both the Proposal title and comment. */
  processName: string;
  observedAt?: string;
  /**
   * ATT&CK technique this specific process was matched against (from the source event's
   * `matched.technique_id`), when the event that produced this selector carried one. Lets the
   * proposal comment name the one technique this process is actually implicated in instead of
   * every technique confirmed anywhere on the host.
   */
  techniqueId?: string;
}

/** One confirmed Tier 2 behavior, deduped by `technique_id` across current-run SSEs. */
export interface HuntEvidenceTechnique {
  techniqueId: string;
  techniqueName?: string;
  rowCount: number;
}

/**
 * Structured hunt evidence extracted once from `hunt_result`, replacing the repeated
 * `evidence_for`/`evidence_against` sentences (one copy per SSE) that used to be quoted
 * verbatim into the proposal comment.
 */
export interface HuntEvidenceSummary {
  /** Max `hunt_result.tier1.counts.total_hits` across current-run SSEs (the report's total, not per-SSE). */
  tier1HitCount?: number;
  /** Union by `technique_id` of `hunt_result.tier2.behaviors[]` with `execution.hit === true`. */
  tier2Confirmed: HuntEvidenceTechnique[];
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
  /** True when any current-run SSE entity is `user.name` or `service.name`, not a host. */
  hasNonHostEntity: boolean;
  /** True when any current-run SSE security knowledge indicator is IOC-typed. */
  hasIocIndicator: boolean;
  /** False when a current-run SSE event ref's `source_index` falls outside the run's `actionable_indices`. */
  allEventsActionable: boolean;
  /** True when a current-run SSE event ref's `source_index` is one of the run's `actionable_indices`. */
  hasProcessBearingEvent: boolean;
  /** Analyst recommendation lines the hunt child wrote onto the current-run SSEs, deduped. */
  manualRemediation: string[];
  /** Structured Tier 1 / Tier 2 evidence for the proposal comment; see `HuntEvidenceSummary`. */
  evidence: HuntEvidenceSummary;
}

export type CatalogListResult =
  | { ok: true; actions: ActionCatalogEntry[] }
  | { ok: false; reason: 'catalog_error' };

export type CoverageSkipReason = 'disabled' | 'denied' | 'storage_failure' | 'already_processed';

export interface CoverageSubject {
  kiId: string;
  reportId: string;
  technique?: string;
  investigationConversationId: string;
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
