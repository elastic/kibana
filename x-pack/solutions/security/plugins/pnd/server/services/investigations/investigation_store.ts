/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, KibanaRequest, Logger } from '@kbn/core/server';
import type {
  GetInvestigationResponse,
  ListInvestigationProposalsResponse,
  ListInvestigationsResponse,
  TimelineEvent,
} from '@kbn/pnd-common';
import type {
  Proposal as CanonicalProposal,
  EvidencePackage,
  WorkerEvaluationRecord,
} from '../../common/schemas';
import type { DetectionChangeSignal } from '../../common/schemas/detection_change';
import type { PndStore, WatchActivityMetrics } from './pnd_store';
import { InvestigationIndexBootstrap } from './investigation_index_bootstrap';
import { InvestigationRecordStore } from './investigation_record_store';
import { InvestigationTimelineStore } from './investigation_timeline_store';
import { ProposalDecisionStore } from './proposal_decision_store';
import { WatchMetricsStore } from './watch_metrics_store';
import { WorkerOutputStore } from './worker_output_store';

type Investigation = ListInvestigationsResponse['investigations'][number];

import type { ProposalStatusUpdate } from './proposal_decision_store';

/**
 * Elasticsearch-backed implementation of {@link PndStore}.
 *
 * This class is a thin facade. It used to be a ~770-line god-class that owned
 * index bootstrapping, investigation CRUD, proposal decisions, Watch-worker
 * output, timeline appends and watch metrics all at once — six unrelated
 * reasons to change in one file, well past the 500-line ceiling in
 * `CONTRIBUTING.md`. Each of those responsibilities now lives in its own
 * collaborator and this class only wires them together and delegates:
 *
 *  - {@link InvestigationIndexBootstrap} — index creation, mappings migration, seeding
 *  - {@link InvestigationRecordStore}    — the Investigation document itself
 *  - {@link ProposalDecisionStore}       — proposal listing + analyst decisions
 *  - {@link WorkerOutputStore}           — canonical Worker run output
 *  - {@link InvestigationTimelineStore}  — escalation/forensic/detection-change events
 *  - {@link WatchMetricsStore}           — per-watch activity aggregations
 *
 * The public API is deliberately unchanged, so `DualWriteStore`,
 * `PndConversationStore` and every route keep talking to the same surface.
 * All collaborators share a single `InvestigationIndexBootstrap` instance so
 * `ensureReady`'s memoized promise still runs bootstrap at most once per
 * plugin lifetime, exactly as the original class did.
 */
export class InvestigationStore implements PndStore {
  private readonly bootstrap: InvestigationIndexBootstrap;
  private readonly investigations: InvestigationRecordStore;
  private readonly proposals: ProposalDecisionStore;
  private readonly workerOutput: WorkerOutputStore;
  private readonly timeline: InvestigationTimelineStore;
  private readonly watchMetrics: WatchMetricsStore;

  constructor(logger: Logger) {
    this.bootstrap = new InvestigationIndexBootstrap(logger);
    this.investigations = new InvestigationRecordStore(this.bootstrap);
    this.proposals = new ProposalDecisionStore(this.bootstrap);
    this.workerOutput = new WorkerOutputStore(this.bootstrap, logger);
    this.timeline = new InvestigationTimelineStore(this.bootstrap, logger);
    this.watchMetrics = new WatchMetricsStore(this.bootstrap);
  }

  /**
   * Create the investigations + proposals indices (if missing) and seed them
   * from the bundled demo data when empty, using the caller's privileges.
   *
   * Runs at most once per plugin lifetime (subsequent calls await the same
   * promise). We bootstrap lazily on the first authenticated request rather
   * than eagerly at start() because the Kibana internal user (kibana_system)
   * is not permitted to create arbitrary data indices — the request-scoped
   * user is.
   */
  public async ensureReady(esClient: ElasticsearchClient): Promise<void> {
    return this.bootstrap.ensureReady(esClient);
  }

  // -- Investigation documents --

  public async listInvestigations(
    esClient: ElasticsearchClient
  ): Promise<ListInvestigationsResponse> {
    return this.investigations.listInvestigations(esClient);
  }

  public async getInvestigation(
    esClient: ElasticsearchClient,
    id: string
  ): Promise<GetInvestigationResponse['investigation'] | null> {
    return this.investigations.getInvestigation(esClient, id);
  }

  public async createInvestigationIfMissing(
    esClient: ElasticsearchClient,
    investigation: Investigation
  ): Promise<void> {
    return this.investigations.createInvestigationIfMissing(esClient, investigation);
  }

  // -- Proposals and analyst decisions --

  public async listProposals(
    esClient: ElasticsearchClient,
    investigationId: string
  ): Promise<ListInvestigationProposalsResponse> {
    return this.proposals.listProposals(esClient, investigationId);
  }

  public async listAllProposals(
    esClient: ElasticsearchClient
  ): Promise<ListInvestigationProposalsResponse> {
    return this.proposals.listAllProposals(esClient);
  }

  public async listApprovedProposals(
    esClient: ElasticsearchClient
  ): Promise<ListInvestigationProposalsResponse> {
    return this.proposals.listApprovedProposals(esClient);
  }

  public async updateProposalStatus(
    esClient: ElasticsearchClient,
    proposalId: string,
    update: ProposalStatusUpdate,
    request?: KibanaRequest
  ): Promise<ProposalStatusUpdate | null> {
    return this.proposals.updateProposalStatus(esClient, proposalId, update, request);
  }

  public async reconcileInvestigationAfterDecision(
    esClient: ElasticsearchClient,
    investigationId: string
  ): Promise<void> {
    return this.proposals.reconcileInvestigationAfterDecision(esClient, investigationId);
  }

  // -- Canonical Watch Worker output --

  public async saveProposal(
    esClient: ElasticsearchClient,
    proposal: CanonicalProposal
  ): Promise<void> {
    return this.workerOutput.saveProposal(esClient, proposal);
  }

  public async saveEvidencePackage(
    esClient: ElasticsearchClient,
    evidence: EvidencePackage
  ): Promise<void> {
    return this.workerOutput.saveEvidencePackage(esClient, evidence);
  }

  public async saveWorkerEvaluationRecord(
    esClient: ElasticsearchClient,
    record: WorkerEvaluationRecord
  ): Promise<void> {
    return this.workerOutput.saveWorkerEvaluationRecord(esClient, record);
  }

  // -- Investigation timeline --

  public async recordEscalation(
    esClient: ElasticsearchClient,
    args: { investigationId: string; sourceWatch: string; escalatedToWatch: string }
  ): Promise<void> {
    return this.timeline.recordEscalation(esClient, args);
  }

  public async recordDeepWatchOutcome(
    esClient: ElasticsearchClient,
    args: {
      investigationId: string;
      events: TimelineEvent[];
      status?: string;
      summary?: string | null;
    }
  ): Promise<void> {
    return this.timeline.recordDeepWatchOutcome(esClient, args);
  }

  public async recordDetectionChangeSignal(
    esClient: ElasticsearchClient,
    args: {
      investigationId: string;
      signal: DetectionChangeSignal;
      event: TimelineEvent;
    }
  ): Promise<void> {
    return this.timeline.recordDetectionChangeSignal(esClient, args);
  }

  // -- Watch activity metrics --

  public async getWatchActivityMetrics(
    esClient: ElasticsearchClient,
    watchIds: string[]
  ): Promise<Record<string, WatchActivityMetrics>> {
    return this.watchMetrics.getWatchActivityMetrics(esClient, watchIds);
  }
}
