/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import type { PndStore } from './pnd_store';

/**
 * Adapter that satisfies the {@link PndStore} interface but is backed by the
 * platform Conversation store (via {@link ConversationWriterClient}) instead
 * of the PND-specific Elasticsearch indices.
 *
 * STATUS: functional stub. The purpose of this class is the *interface seam* —
 * it makes the eventual migration swap mechanical. For now:
 *
 * - Read methods delegate to the provided {@link InvestigationStore} (the
 *   current source of truth) so callers keep working.
 * - Write methods log the call and throw `'PndConversationStore: not implemented'`
 *   because the actual dual-write/cut-over requires a running platform
 *   conversation store with templated conversations (gated on Phase 4).
 *
 * Once the platform conversation store is ready, each method body is replaced
 * with a real mapping (see {@link template_mapping.ts}) + ConversationWriterClient
 * call — the surrounding plugin code does not change.
 */
export class PndConversationStore implements PndStore {
  constructor(private readonly logger: Logger, private readonly legacy: PndStore) {}

  async ensureReady(esClient: ElasticsearchClient): Promise<void> {
    this.logger.info('PndConversationStore.ensureReady called — delegating to legacy store');
    return this.legacy.ensureReady(esClient);
  }

  async listInvestigations(esClient: ElasticsearchClient) {
    this.logger.info('PndConversationStore.listInvestigations called — delegating to legacy store');
    return this.legacy.listInvestigations(esClient);
  }

  async getInvestigation(esClient: ElasticsearchClient, investigationId: string) {
    this.logger.info('PndConversationStore.getInvestigation called — delegating to legacy store');
    return this.legacy.getInvestigation(esClient, investigationId);
  }

  async listProposals(esClient: ElasticsearchClient, investigationId: string) {
    this.logger.info('PndConversationStore.listProposals called — delegating to legacy store');
    return this.legacy.listProposals(esClient, investigationId);
  }

  async updateProposalStatus(...args: Parameters<PndStore['updateProposalStatus']>) {
    this.logger.info('PndConversationStore.updateProposalStatus called — not implemented');
    throw new Error('PndConversationStore.updateProposalStatus: not implemented');
  }

  async saveProposal(...args: Parameters<PndStore['saveProposal']>): Promise<void> {
    this.logger.info('PndConversationStore.saveProposal called — not implemented');
    throw new Error('PndConversationStore.saveProposal: not implemented');
  }

  async saveEvidencePackage(...args: Parameters<PndStore['saveEvidencePackage']>): Promise<void> {
    this.logger.info('PndConversationStore.saveEvidencePackage called — not implemented');
    throw new Error('PndConversationStore.saveEvidencePackage: not implemented');
  }

  async saveWorkerEvaluationRecord(
    ...args: Parameters<PndStore['saveWorkerEvaluationRecord']>
  ): Promise<void> {
    this.logger.info('PndConversationStore.saveWorkerEvaluationRecord called — not implemented');
    throw new Error('PndConversationStore.saveWorkerEvaluationRecord: not implemented');
  }

  async recordEscalation(...args: Parameters<PndStore['recordEscalation']>): Promise<void> {
    this.logger.info('PndConversationStore.recordEscalation called — not implemented');
    throw new Error('PndConversationStore.recordEscalation: not implemented');
  }

  async recordDeepWatchOutcome(
    ...args: Parameters<PndStore['recordDeepWatchOutcome']>
  ): Promise<void> {
    this.logger.info('PndConversationStore.recordDeepWatchOutcome called — not implemented');
    throw new Error('PndConversationStore.recordDeepWatchOutcome: not implemented');
  }

  async recordDetectionChangeSignal(
    ...args: Parameters<PndStore['recordDetectionChangeSignal']>
  ): Promise<void> {
    this.logger.info('PndConversationStore.recordDetectionChangeSignal called — not implemented');
    throw new Error('PndConversationStore.recordDetectionChangeSignal: not implemented');
  }
}
