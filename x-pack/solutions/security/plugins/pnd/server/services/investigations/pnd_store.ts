/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import type {
  GetInvestigationResponse,
  ListInvestigationProposalsResponse,
  ListInvestigationsResponse,
  TimelineEvent,
} from '@kbn/pnd-common';
import type { EvidencePackage, WorkerEvaluationRecord } from '../../common/schemas';
import type { DetectionChangeSignal } from '../../common/schemas/detection_change';
import type { Proposal as CanonicalProposal } from '../../common/schemas';
import type { DismissalReason, ProposalStatusUpdate } from './investigation_store';

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
  listProposals(
    esClient: ElasticsearchClient,
    investigationId: string
  ): Promise<ListInvestigationProposalsResponse>;
  updateProposalStatus(
    esClient: ElasticsearchClient,
    proposalId: string,
    update: ProposalStatusUpdate
  ): Promise<ProposalStatusUpdate | null>;
  saveProposal(esClient: ElasticsearchClient, proposal: CanonicalProposal): Promise<void>;
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
}

/**
 * Re-export types the routes depend on so consumers can import them from the
 * interface module rather than reaching into the concrete implementation.
 */
export type { DismissalReason, ProposalStatusUpdate };
