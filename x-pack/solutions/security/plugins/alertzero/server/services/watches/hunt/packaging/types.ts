/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PackageReportMintPayload } from '../../../../../common/step_types/package_report';

/**
 * One host observed on a current-run SSE. Packaging hands every confirmed host to
 * Forensics Watch as-is: whether the host is enrolled, and what can be done on it, is
 * decided by the forensic run, not here.
 */
export interface CurrentRunHost {
  name: string;
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
  /** Technique ids from current-run SKIs (`type: technique`), proposed or corroborated. */
  techniques: string[];
  /**
   * Subset of `techniques` this run actually corroborated (the SSE entry naming it carried
   * `corroborated_technique_id`), as opposed to one merely named on the report-scoped
   * fallback entry's indicator list. Only this subset may claim a confirmed hit.
   */
  corroboratedTechniques: string[];
  /** Hosts named by `host.name` / `host.hostname` entities, deduped by name. */
  hosts: CurrentRunHost[];
  /** True when any current-run SSE entity is `user.name` or `service.name`, not a host. */
  hasNonHostEntity: boolean;
  /** True when any current-run SSE security knowledge indicator is IOC-typed. */
  hasIocIndicator: boolean;
  /** Analyst recommendation lines the hunt child wrote onto the current-run SSEs, deduped. */
  manualRemediation: string[];
  /** Structured Tier 1 / Tier 2 evidence for the proposal comment; see `HuntEvidenceSummary`. */
  evidence: HuntEvidenceSummary;
  /**
   * The hunt window the current-run SSEs were searched in (earliest `from`, latest `to`),
   * handed to the forensic agent as its time scope. Absent when no SSE carried one.
   */
  huntWindow?: { from: string; to: string };
}

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
