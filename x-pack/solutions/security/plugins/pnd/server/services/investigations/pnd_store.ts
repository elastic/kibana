/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, KibanaRequest } from '@kbn/core/server';
import type {
  GetInvestigationResponse,
  ListInvestigationProposalsResponse,
  ListInvestigationsResponse,
  TimelineEvent,
} from '@kbn/pnd-common';
import type { EvidencePackage, WorkerEvaluationRecord } from '../../common/schemas';
import type { DetectionChangeSignal } from '../../common/schemas/detection_change';
import type { Proposal as CanonicalProposal } from '../../common/schemas';
import type { DismissalReason, ProposalStatusUpdate } from './proposal_decision_store';

type Investigation = ListInvestigationsResponse['investigations'][number];

/**
 * Interface extracted from {@link InvestigationStore} so the PND plugin can
 * talk to an abstraction instead of the concrete ES-backed implementation.
 *
 * The immediate purpose is the migration seam: a {@link PndConversationStore}
 * adapter and a {@link DualWriteStore} wrapper both implement this interface,
 * so the rest of the plugin is unaware of which backing store is active.
 */
export interface PndStore {
  ensureReady(esClient: ElasticsearchClient): Promise<void>;
  listInvestigations(esClient: ElasticsearchClient): Promise<ListInvestigationsResponse>;
  getInvestigation(
    esClient: ElasticsearchClient,
    id: string
  ): Promise<GetInvestigationResponse['investigation'] | null>;
  /**
   * Create a new Investigation if `id` doesn't already exist (idempotent —
   * a re-run with the same id is a no-op). This is the "open an
   * Investigation Conversation" step Watch orchestrators need on first
   * touch of a fresh alert, before any proposal/evidence can be attached to
   * it (proposals reference investigationId but nothing else mints one).
   */
  createInvestigationIfMissing(
    esClient: ElasticsearchClient,
    investigation: Investigation
  ): Promise<void>;
  listProposals(
    esClient: ElasticsearchClient,
    investigationId: string
  ): Promise<ListInvestigationProposalsResponse>;

  /**
   * List ALL proposals across ALL investigations, sorted by pending-first then
   * by confidence descending. Used by the Brief queue which shows one row per
   * pending Proposal (ratified queue model, 2026-07-28 design/eng sync).
   */
  listAllProposals(esClient: ElasticsearchClient): Promise<ListInvestigationProposalsResponse>;

  /** List proposals with status 'approved', sorted by decidedAt desc. */
  listApprovedProposals(esClient: ElasticsearchClient): Promise<ListInvestigationProposalsResponse>;
  updateProposalStatus(
    esClient: ElasticsearchClient,
    proposalId: string,
    update: ProposalStatusUpdate,
    request?: KibanaRequest
  ): Promise<ProposalStatusUpdate | null>;
  /**
   * Refresh the parent Investigation's denormalised decision fields (currently
   * `pendingProposalCount`) after one of its proposals changed status.
   *
   * Required because `updateProposalStatus` only writes the proposal document,
   * while the Brief queue derives its primary CTA from the investigation — so
   * without this the list and the detail page disagree about the same record.
   */
  reconcileInvestigationAfterDecision(
    esClient: ElasticsearchClient,
    investigationId: string
  ): Promise<void>;
  saveProposal(
    esClient: ElasticsearchClient,
    proposal: CanonicalProposal,
    request?: KibanaRequest
  ): Promise<void>;
  saveEvidencePackage(esClient: ElasticsearchClient, evidence: EvidencePackage): Promise<void>;
  saveWorkerEvaluationRecord(
    esClient: ElasticsearchClient,
    record: WorkerEvaluationRecord
  ): Promise<void>;
  recordEscalation(
    esClient: ElasticsearchClient,
    args: { investigationId: string; sourceWatch: string; escalatedToWatch: string }
  ): Promise<void>;
  recordDeepWatchOutcome(
    esClient: ElasticsearchClient,
    args: {
      investigationId: string;
      events: TimelineEvent[];
      status?: string;
      summary?: string | null;
    }
  ): Promise<void>;
  recordDetectionChangeSignal(
    esClient: ElasticsearchClient,
    args: { investigationId: string; signal: DetectionChangeSignal; event: TimelineEvent }
  ): Promise<void>;
  /**
   * Real per-watch activity metrics derived from Investigation/Proposal
   * documents — the actual event stream Watches produce — rather than raw
   * workflow-execution telemetry (`.workflows-executions`), which is empty
   * on any stack where workflows are installed but have never fired.
   *
   * `timeSaved` is intentionally omitted: no field in the Investigation or
   * Proposal schema captures analyst time-per-decision, so there is no
   * honest way to compute it. Watch.metrics.timeSaved stays `null`.
   */
  getWatchActivityMetrics(
    esClient: ElasticsearchClient,
    watchIds: string[]
  ): Promise<Record<string, WatchActivityMetrics>>;
}

export interface WatchActivityMetrics {
  runs7d: number | null;
  acceptedPct: number | null;
  lastRun: string | null;
}

/**
 * Re-export types the routes depend on so consumers can import them from the
 * interface module rather than reaching into the concrete implementation.
 */
export type { DismissalReason, ProposalStatusUpdate };
