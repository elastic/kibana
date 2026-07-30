/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import type { EvidencePackage, WorkerEvaluationRecord } from '../../common/schemas';
import type { Proposal as CanonicalProposal } from '../../common/schemas';
import type { InvestigationIndexBootstrap } from './investigation_index_bootstrap';
import {
  PND_CANONICAL_PROPOSALS_INDEX,
  PND_EVIDENCE_INDEX,
  PND_PROPOSALS_INDEX,
  PND_WORKER_EVAL_INDEX,
} from './investigation_index_bootstrap';
import { canonicalProposalToUiProposalDoc } from './template_mapping';

/**
 * Persists the canonical output a Watch Worker run produces: the Daybreak
 * Proposal contract, its supporting EvidencePackage, and the
 * WorkerEvaluationRecord scorers read.
 *
 * Extracted from the former monolithic `InvestigationStore` (see
 * `investigation_store.ts`'s class doc).
 */
export class WorkerOutputStore {
  constructor(
    private readonly bootstrap: InvestigationIndexBootstrap,
    private readonly logger: Logger
  ) {}

  /**
   * Persist a canonical Daybreak Proposal produced by a Watch Worker run.
   * Overwrites by id so a re-run is idempotent.
   */
  public async saveProposal(
    esClient: ElasticsearchClient,
    proposal: CanonicalProposal
  ): Promise<void> {
    await this.bootstrap.ensureReady(esClient);
    await esClient.index({
      index: PND_CANONICAL_PROPOSALS_INDEX,
      id: proposal.id,
      document: proposal,
      refresh: true,
    });

    // Also project into the UI-facing index the Investigations UI's Proposals
    // tab actually reads (listProposals queries PND_PROPOSALS_INDEX, not
    // PND_CANONICAL_PROPOSALS_INDEX — two different schemas for two
    // different consumers, see canonicalProposalToUiProposalDoc's doc
    // comment). Best-effort: a failure here must not fail the canonical
    // write, which is the source of truth for eval/scoring.
    try {
      await esClient.index({
        index: PND_PROPOSALS_INDEX,
        id: proposal.id,
        // Denormalised investigationId copy so listProposals' term-query
        // works without a join, mirroring the seedIfEmpty bulk convention;
        // stripped in listProposals before the doc reaches the API.
        document: {
          ...canonicalProposalToUiProposalDoc(proposal),
          investigationId: proposal.investigationId,
        },
        refresh: true,
      });
    } catch (error) {
      this.logger.warn(
        `PND: saveProposal UI-projection write failed for ${proposal.id}: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }

  /** Persist a canonical EvidencePackage produced by a Watch Worker run. */
  public async saveEvidencePackage(
    esClient: ElasticsearchClient,
    evidence: EvidencePackage
  ): Promise<void> {
    await this.bootstrap.ensureReady(esClient);
    await esClient.index({
      index: PND_EVIDENCE_INDEX,
      id: evidence.id,
      document: evidence,
      refresh: true,
    });
  }

  /**
   * Persist exactly one WorkerEvaluationRecord per Worker run. This is the
   * canonical record the Evaluation & Trust scorers read (no parallel store).
   */
  public async saveWorkerEvaluationRecord(
    esClient: ElasticsearchClient,
    record: WorkerEvaluationRecord
  ): Promise<void> {
    await this.bootstrap.ensureReady(esClient);
    await esClient.index({
      index: PND_WORKER_EVAL_INDEX,
      id: record.id,
      document: record,
      refresh: true,
    });
  }
}
