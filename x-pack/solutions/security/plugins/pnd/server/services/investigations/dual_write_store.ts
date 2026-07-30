/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import type { PndStore } from './pnd_store';

/**
 * Wraps two {@link PndStore} implementations so every call is dispatched to
 * both the legacy store (source of truth) and the new platform conversation
 * store (shadow).
 *
 * Read operations delegate to {@link primary} only. Write operations are
 * fanned out: the legacy store runs first, and if it succeeds the new store
 * runs as well — failures in the new store are logged but do not fail the
 * caller, because the new store is a shadow during the dual-write phase.
 *
 * When the migration flag is off the plugin uses {@link InvestigationStore}
 * directly (no behavior change). When the flag is on it wraps the legacy store
 * with this class.
 */
export class DualWriteStore implements PndStore {
  constructor(
    private readonly logger: Logger,
    private readonly primary: PndStore,
    private readonly shadow: PndStore
  ) {}

  async ensureReady(esClient: ElasticsearchClient): Promise<void> {
    await this.primary.ensureReady(esClient);
    // Shadow store readiness is best-effort during dual-write.
    try {
      await this.shadow.ensureReady(esClient);
    } catch (error) {
      this.logger.warn(`DualWriteStore: shadow ensureReady failed: ${error?.message}`);
    }
  }

  // -- Read methods: delegate to primary only --

  async listInvestigations(esClient: ElasticsearchClient) {
    return this.primary.listInvestigations(esClient);
  }

  async getInvestigation(esClient: ElasticsearchClient, investigationId: string) {
    return this.primary.getInvestigation(esClient, investigationId);
  }

  async listProposals(esClient: ElasticsearchClient, investigationId: string) {
    return this.primary.listProposals(esClient, investigationId);
  }

  async listAllProposals(esClient: ElasticsearchClient) {
    return this.primary.listAllProposals(esClient);
  }

  async listApprovedProposals(esClient: ElasticsearchClient) {
    return this.primary.listApprovedProposals(esClient);
  }

  async getWatchActivityMetrics(esClient: ElasticsearchClient, watchIds: string[]) {
    return this.primary.getWatchActivityMetrics(esClient, watchIds);
  }

  // -- Write methods: primary first, then shadow (best-effort) --

  async createInvestigationIfMissing(
    ...args: Parameters<PndStore['createInvestigationIfMissing']>
  ): Promise<void> {
    await this.primary.createInvestigationIfMissing(...args);
    this.fanOutWrite('createInvestigationIfMissing', args);
  }

  async updateProposalStatus(...args: Parameters<PndStore['updateProposalStatus']>) {
    const result = await this.primary.updateProposalStatus(...args);
    this.fanOutWrite('updateProposalStatus', args);
    return result;
  }

  async reconcileInvestigationAfterDecision(
    ...args: Parameters<PndStore['reconcileInvestigationAfterDecision']>
  ): Promise<void> {
    await this.primary.reconcileInvestigationAfterDecision(...args);
    this.fanOutWrite('reconcileInvestigationAfterDecision', args);
  }

  async saveProposal(...args: Parameters<PndStore['saveProposal']>): Promise<void> {
    await this.primary.saveProposal(...args);
    this.fanOutWrite('saveProposal', args);
  }

  async saveEvidencePackage(...args: Parameters<PndStore['saveEvidencePackage']>): Promise<void> {
    await this.primary.saveEvidencePackage(...args);
    this.fanOutWrite('saveEvidencePackage', args);
  }

  async saveWorkerEvaluationRecord(
    ...args: Parameters<PndStore['saveWorkerEvaluationRecord']>
  ): Promise<void> {
    await this.primary.saveWorkerEvaluationRecord(...args);
    this.fanOutWrite('saveWorkerEvaluationRecord', args);
  }

  async recordEscalation(...args: Parameters<PndStore['recordEscalation']>): Promise<void> {
    await this.primary.recordEscalation(...args);
    this.fanOutWrite('recordEscalation', args);
  }

  async recordDeepWatchOutcome(
    ...args: Parameters<PndStore['recordDeepWatchOutcome']>
  ): Promise<void> {
    await this.primary.recordDeepWatchOutcome(...args);
    this.fanOutWrite('recordDeepWatchOutcome', args);
  }

  async recordDetectionChangeSignal(
    ...args: Parameters<PndStore['recordDetectionChangeSignal']>
  ): Promise<void> {
    await this.primary.recordDetectionChangeSignal(...args);
    this.fanOutWrite('recordDetectionChangeSignal', args);
  }

  /**
   * Fire a write to the shadow store without awaiting — the primary has already
   * succeeded so the caller should not be blocked by the shadow. Shadow failures
   * are logged as warnings.
   */
  private fanOutWrite<MethodName extends keyof PndStore>(
    methodName: MethodName,
    args: Parameters<PndStore[MethodName]>
  ): void {
    void Promise.resolve().then(async () => {
      try {
        const method = this.shadow[methodName] as (...a: unknown[]) => Promise<unknown>;
        // Call bound to `this.shadow` — extracting the method reference above
        // detaches it from its instance, so an unbound call would run with
        // `this === undefined` inside the shadow store and throw on any
        // `this.<field>` access.
        await method.apply(this.shadow, args as unknown[]);
      } catch (error) {
        this.logger.warn(
          `DualWriteStore: shadow ${String(methodName)} failed: ${
            error instanceof Error ? error.message : String(error)
          }`
        );
      }
    });
  }
}
