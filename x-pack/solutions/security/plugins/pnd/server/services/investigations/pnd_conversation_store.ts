/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, KibanaRequest, Logger } from '@kbn/core/server';
import type { ConversationWriterClient } from '@kbn/agent-builder-server';
import type { PndStore } from './pnd_store';
import { proposalToConversationCreate } from './template_mapping';
import type { ProposalStatusUpdate } from './investigation_store';

/**
 * Resolver that obtains a {@link ConversationWriterClient}. The plugin wires
 * this to a scoped call on `agentBuilder.getScopedWriterClient` using the
 * internal user context (shadow writes are service-account-initiated, not
 * per-request — consistent with D10's run-as identity model).
 */
export type ConversationWriterResolver = (
  request: KibanaRequest
) => Promise<ConversationWriterClient>;

/**
 * Adapter that satisfies the {@link PndStore} interface but is backed by the
 * platform Conversation store (via {@link ConversationWriterClient}) instead
 * of the PND-specific Elasticsearch indices.
 *
 * STATUS: active shadow-write. Read methods delegate to the legacy
 * {@link InvestigationStore}. Write methods map PND domain objects to
 * platform Conversations via {@link template_mapping.ts} and call the
 * writer client.
 *
 * This is used inside {@link DualWriteStore} — failures here are logged but
 * do not fail the primary write.
 */
export class PndConversationStore implements PndStore {
  constructor(
    private readonly logger: Logger,
    private readonly legacy: PndStore,
    private readonly writerResolver?: ConversationWriterResolver
  ) {}

  async ensureReady(esClient: ElasticsearchClient): Promise<void> {
    return this.legacy.ensureReady(esClient);
  }

  async listInvestigations(esClient: ElasticsearchClient) {
    return this.legacy.listInvestigations(esClient);
  }

  async getInvestigation(esClient: ElasticsearchClient, investigationId: string) {
    return this.legacy.getInvestigation(esClient, investigationId);
  }

  async createInvestigationIfMissing(
    ...args: Parameters<PndStore['createInvestigationIfMissing']>
  ): Promise<void> {
    // Investigation creation is not yet mapped to a platform Conversation
    // shape (see saveProposal's cast-through-unknown comment on template
    // divergence) — delegate to the legacy store only for now.
    return this.legacy.createInvestigationIfMissing(...args);
  }

  async listProposals(esClient: ElasticsearchClient, investigationId: string) {
    return this.legacy.listProposals(esClient, investigationId);
  }

  async listAllProposals(esClient: ElasticsearchClient) {
    return this.legacy.listAllProposals(esClient);
  }

  async listApprovedProposals(esClient: ElasticsearchClient) {
    return this.legacy.listApprovedProposals(esClient);
  }

  async getWatchActivityMetrics(esClient: ElasticsearchClient, watchIds: string[]) {
    return this.legacy.getWatchActivityMetrics(esClient, watchIds);
  }

  async updateProposalStatus(
    esClient: ElasticsearchClient,
    proposalId: string,
    update: ProposalStatusUpdate,
    request?: KibanaRequest
  ): Promise<ProposalStatusUpdate | null> {
    // Delegate to legacy first (DualWriteStore already did the primary write).
    const result = await this.legacy.updateProposalStatus(esClient, proposalId, update);

    // Shadow: update the platform Conversation's extended_fields.
    if (this.writerResolver && request) {
      try {
        const client = await this.writerResolver(request);
        const extendedFields: Record<string, string> = { status: update.status };
        if (update.status === 'dismissed' && update.dismissalReason) {
          extendedFields.dismissal_reason = update.dismissalReason;
        }
        if (update.status === 'escalated' && update.caseRef) {
          extendedFields.case_ref = update.caseRef;
        }
        await client.update({
          id: proposalId,
          extended_fields: extendedFields,
        });
        this.logger.info(
          `PndConversationStore: shadow-updated proposal ${proposalId} → ${update.status}`
        );
      } catch (error) {
        this.logger.warn(
          `PndConversationStore: shadow updateProposalStatus failed for ${proposalId}: ${
            error instanceof Error ? error.message : String(error)
          }`
        );
      }
    }
    return result;
  }

  async reconcileInvestigationAfterDecision(
    ...args: Parameters<PndStore['reconcileInvestigationAfterDecision']>
  ): Promise<void> {
    // Legacy-only concern: recomputes the ES-backed investigation document's
    // `pendingProposalCount`. The platform Conversation store has no
    // equivalent denormalised counter to reconcile.
    return this.legacy.reconcileInvestigationAfterDecision(...args);
  }

  async saveProposal(
    esClient: ElasticsearchClient,
    proposal: Parameters<PndStore['saveProposal']>[1],
    request?: KibanaRequest
  ): Promise<void> {
    await this.legacy.saveProposal(esClient, proposal);

    if (this.writerResolver && request) {
      try {
        const client = await this.writerResolver(request);
        // Cast through unknown: the canonical Proposal (server/common/schemas)
        // and the @kbn/pnd-common Proposal are structurally similar but
        // statically distinct. The mapping function reads the shared fields.
        const createRequest = proposalToConversationCreate(
          proposal as unknown as Parameters<typeof proposalToConversationCreate>[0]
        );
        await client.create(createRequest);
        this.logger.info(
          `PndConversationStore: shadow-created proposal conversation for ${proposal.id}`
        );
      } catch (error) {
        this.logger.warn(
          `PndConversationStore: shadow saveProposal failed for ${proposal.id}: ${
            error instanceof Error ? error.message : String(error)
          }`
        );
      }
    }
  }

  async saveEvidencePackage(...args: Parameters<PndStore['saveEvidencePackage']>): Promise<void> {
    // Evidence packages are stored as timeline events in the legacy store.
    // Shadow-writing them as Conversation rounds is a future enhancement.
    return this.legacy.saveEvidencePackage(...args);
  }

  async saveWorkerEvaluationRecord(
    ...args: Parameters<PndStore['saveWorkerEvaluationRecord']>
  ): Promise<void> {
    // WorkerEvaluationRecords are stored in the legacy ES index.
    // Shadow-writing to Conversations is deferred (not a Conversation type).
    return this.legacy.saveWorkerEvaluationRecord(...args);
  }

  async recordEscalation(...args: Parameters<PndStore['recordEscalation']>): Promise<void> {
    return this.legacy.recordEscalation(...args);
  }

  async recordDeepWatchOutcome(
    ...args: Parameters<PndStore['recordDeepWatchOutcome']>
  ): Promise<void> {
    return this.legacy.recordDeepWatchOutcome(...args);
  }

  async recordDetectionChangeSignal(
    ...args: Parameters<PndStore['recordDetectionChangeSignal']>
  ): Promise<void> {
    return this.legacy.recordDetectionChangeSignal(...args);
  }
}
