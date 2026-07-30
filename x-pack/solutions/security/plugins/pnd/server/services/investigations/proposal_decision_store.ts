/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, KibanaRequest } from '@kbn/core/server';
import type { ListInvestigationProposalsResponse } from '@kbn/pnd-common';
import type { InvestigationIndexBootstrap } from './investigation_index_bootstrap';
import { PND_INVESTIGATIONS_INDEX, PND_PROPOSALS_INDEX } from './investigation_index_bootstrap';

type Proposal = ListInvestigationProposalsResponse['proposals'][number];

/**
 * Terminal + intermediate proposal states an analyst decision can move a
 * proposal into. Persisted on the proposal document in ES.
 */
export type DismissalReason =
  | 'wrong'
  | 'duplicate'
  | 'insufficient_evidence'
  | 'low_value'
  | 'out_of_scope'
  | 'already_handled'
  | 'other';

export type ProposalStatusUpdate =
  | { status: 'approved' }
  | { status: 'dismissed'; rejectionReason?: string; dismissalReason?: DismissalReason }
  | { status: 'modified'; analystReasoning: string }
  | { status: 'escalated'; caseRef?: string }
  | { status: 'deferred'; sla?: string }
  | { status: 'pending'; assignee: string | null };

interface ProposalDoc extends Proposal {
  investigationId: string;
  rejectionReason?: string;
  dismissalReason?: DismissalReason;
  analystReasoning?: string;
  caseRef?: string;
}

/**
 * List/decide operations on Proposal documents — the mutable analyst decision
 * state (accept / reject / modify) attached to a read-only Investigation.
 *
 * Extracted from the former monolithic `InvestigationStore` (see
 * `investigation_store.ts`'s class doc).
 */
export class ProposalDecisionStore {
  constructor(private readonly bootstrap: InvestigationIndexBootstrap) {}

  public async listProposals(
    esClient: ElasticsearchClient,
    investigationId: string
  ): Promise<ListInvestigationProposalsResponse> {
    await this.bootstrap.ensureReady(esClient);
    const result = await esClient.search<ProposalDoc>({
      index: PND_PROPOSALS_INDEX,
      size: 1000,
      // `investigationId` is now mapped as `keyword`, so it is filtered directly.
      // The previous `investigationId.keyword` path only existed because dynamic
      // mapping made the field `text` with a `.keyword` subfield.
      query: { term: { investigationId } },
    });

    const proposals = result.hits.hits
      .map((hit) => hit._source)
      .filter((src): src is ProposalDoc => src != null)
      .map(({ investigationId: _omit, ...proposal }) => proposal);
    return { proposals, total: proposals.length };
  }

  /**
   * List ALL proposals across ALL investigations for the Brief queue.
   * Sorted: pending-first (pending has no numeric sort key in ES, so sort in
   * application code), then by confidence descending.
   */
  public async listAllProposals(
    esClient: ElasticsearchClient
  ): Promise<ListInvestigationProposalsResponse> {
    await this.bootstrap.ensureReady(esClient);
    const result = await esClient.search<ProposalDoc>({
      index: PND_PROPOSALS_INDEX,
      size: 1000,
      query: { match_all: {} },
    });

    const proposals = result.hits.hits
      .map((hit) => hit._source)
      .filter((src): src is ProposalDoc => src != null)
      .map(({ investigationId: _omit, ...proposal }) => proposal)
      .sort((a, b) => {
        // Pending proposals first (they need analyst attention).
        const aPending = a.status === 'pending' ? 0 : 1;
        const bPending = b.status === 'pending' ? 0 : 1;
        if (aPending !== bPending) {
          return aPending - bPending;
        }
        // Then by confidence descending.
        return (b.confidence ?? 0) - (a.confidence ?? 0);
      });

    return { proposals, total: proposals.length };
  }

  /**
   * List proposals with status 'approved', sorted by decidedAt descending
   * (most recent first). Used by the Brief page's "Recently Approved"
   * section for post-approval monitoring.
   */
  public async listApprovedProposals(
    esClient: ElasticsearchClient
  ): Promise<ListInvestigationProposalsResponse> {
    await this.bootstrap.ensureReady(esClient);
    const result = await esClient.search<ProposalDoc>({
      index: PND_PROPOSALS_INDEX,
      size: 20,
      query: { term: { status: 'approved' } },
      sort: [{ decidedAt: { order: 'desc' } }],
    });

    const proposals = result.hits.hits
      .map((hit) => hit._source)
      .filter((src): src is ProposalDoc => src != null)
      .map(({ investigationId: _omit, ...proposal }) => proposal);

    return { proposals, total: proposals.length };
  }

  /**
   * Apply an analyst decision to a proposal document. Returns the updated
   * status, or null when the proposal does not exist.
   */
  public async updateProposalStatus(
    esClient: ElasticsearchClient,
    proposalId: string,
    update: ProposalStatusUpdate,
    _request?: KibanaRequest
  ): Promise<ProposalStatusUpdate | null> {
    await this.bootstrap.ensureReady(esClient);
    const doc: Record<string, unknown> = {
      status: update.status,
      decidedAt: new Date().toISOString(),
    };
    if (update.status === 'dismissed') {
      if (update.rejectionReason != null) doc.rejectionReason = update.rejectionReason;
      if (update.dismissalReason != null) doc.dismissalReason = update.dismissalReason;
    }
    if (update.status === 'modified') {
      doc.analystReasoning = update.analystReasoning;
    }
    if (update.status === 'escalated' && update.caseRef != null) {
      doc.caseRef = update.caseRef;
    }
    if (update.status === 'deferred' && update.sla != null) {
      doc.sla = update.sla;
    }
    if (update.status === 'pending') {
      doc.assignee = update.assignee;
    }

    try {
      await esClient.update({
        index: PND_PROPOSALS_INDEX,
        id: proposalId,
        doc,
        refresh: true,
      });
      return update;
    } catch (error) {
      if (error?.meta?.statusCode === 404) {
        return null;
      }
      throw error;
    }
  }

  /**
   * Recompute the parent Investigation's decision-facing fields after one of its
   * proposals changed status.
   *
   * Why this exists: `updateProposalStatus` writes the proposal document only.
   * The Brief queue card, however, renders investigation-level fields
   * (`pendingProposalCount`, and via it the primary CTA). Without this
   * reconciliation the queue keeps advertising a pre-decision action — "Isolate
   * endpoint" — for an investigation whose only proposal already reads
   * "Escalated", i.e. the list and the detail page disagree about the same
   * record.
   *
   * `pendingProposalCount` is recounted from the proposal index rather than
   * decremented, so a re-run or an out-of-order decision converges on the
   * truth instead of drifting.
   *
   * Best-effort by design: the analyst's decision is already durably recorded
   * on the proposal document, so a failure to refresh the parent's denormalised
   * counters must not fail the decision request.
   */
  public async reconcileInvestigationAfterDecision(
    esClient: ElasticsearchClient,
    investigationId: string
  ): Promise<void> {
    await this.bootstrap.ensureReady(esClient);
    try {
      const pending = await esClient.count({
        index: PND_PROPOSALS_INDEX,
        query: {
          bool: {
            filter: [{ term: { investigationId } }, { term: { status: 'pending' } }],
          },
        },
      });

      await esClient.update({
        index: PND_INVESTIGATIONS_INDEX,
        id: investigationId,
        doc: {
          pendingProposalCount: pending.count,
          updatedAt: new Date().toISOString(),
        },
        refresh: true,
      });
    } catch (error) {
      if (error?.meta?.statusCode === 404) {
        return;
      }
      throw error;
    }
  }
}
