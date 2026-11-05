/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EsClient } from '@kbn/scout-security';
import type { ListProposalsResponse } from '@kbn/proposals-common';
import { AI_INDEX_KI_BACKING_INDEX, CONVERSATIONS_URL, PROPOSALS_URL } from './constants';
import { ok } from './kbn';
import type { AlertZeroApi } from './kbn';

export interface InvestigationProposal {
  readonly id: string;
  readonly conversationId: string;
  readonly title: string;
  readonly actionWorkflowId?: string;
  readonly actionInput?: Record<string, unknown>;
  readonly createdAt: string;
}

/**
 * Pending containment cards, optionally scoped to one investigation. `conversationId` is what
 * keeps a run's assertions on its own cards: the queue is shared across the space.
 */
export const listInvestigationProposals = async (
  api: AlertZeroApi,
  conversationId?: string
): Promise<InvestigationProposal[]> =>
  ok(
    await api.internal<ListProposalsResponse>('GET', PROPOSALS_URL, {
      query: {
        origin: 'alertzero',
        status: 'pending',
        excludeSuperseded: true,
        size: 100,
        ...(conversationId ? { conversationId } : {}),
      },
    }),
    'list pending proposals'
  ).proposals as InvestigationProposal[];

/**
 * Deletes an Investigation conversation; its attachments are deleted with it. A 404 means an
 * earlier teardown already removed it, anything else non-2xx fails loudly — `api.public`
 * resolves non-2xx responses as values, so discarding the result would make teardown look
 * successful while the conversation (and its pending containment cards) survived.
 */
export const deleteInvestigation = async (api: AlertZeroApi, id: string): Promise<void> => {
  const response = await api.public('DELETE', `${CONVERSATIONS_URL}/${encodeURIComponent(id)}`);
  if (response.statusCode >= 300 && response.statusCode !== 404) {
    throw new Error(
      `Delete investigation ${id} failed: ${response.statusCode} ${JSON.stringify(response.body)}`
    );
  }
};

/**
 * Dismisses every pending proposal attached to one Investigation. The endpoint-analysis run
 * raises containment cards (isolate/collect) whose action input can carry only `endpoint_ids`
 * and a comment, so the alert- and agent-keyed run correlation cannot match them; the
 * conversation id is the one identifier every card on this Investigation shares. Dismissal —
 * not approval — releases the parked run behind each card, which then ends on its declined
 * branch while the service account still exists, so this belongs before the account teardown.
 */
export const dismissInvestigationProposals = async (
  api: AlertZeroApi,
  conversationId: string
): Promise<void> => {
  for (const proposal of await listInvestigationProposals(api, conversationId)) {
    const response = await api.internal(
      'POST',
      `${PROPOSALS_URL}/${encodeURIComponent(proposal.id)}/dismiss`,
      { body: { dismissReason: 'handled_elsewhere', rationale: 'AlertZero e2e teardown' } }
    );
    // A 409 means the card was decided concurrently (its spec approved it, or a teardown cancel
    // already ended the run behind it), which teardown accepts.
    if (response.statusCode >= 300 && response.statusCode !== 409) {
      throw new Error(
        `dismiss proposal ${proposal.id} of investigation ${conversationId} failed: ${
          response.statusCode
        } ${JSON.stringify(response.body)}`
      );
    }
  }
};

/**
 * Removes exactly the indicators this run wrote. Matches the indicator's own `id` as well as the
 * document id: a seeded indicator is indexed under its id, but `context-engine.createKi` lets
 * Elasticsearch generate the document id and stores the indicator id only in `_source.id`.
 */
export const cleanupKnowledgeIndicators = async (
  esClient: EsClient,
  kiIds: readonly string[]
): Promise<void> => {
  if (kiIds.length === 0) {
    return;
  }
  await esClient
    .deleteByQuery({
      index: AI_INDEX_KI_BACKING_INDEX,
      conflicts: 'proceed',
      refresh: true,
      query: {
        bool: {
          should: [{ ids: { values: [...kiIds] } }, { terms: { id: [...kiIds] } }],
          minimum_should_match: 1,
        },
      },
    })
    .catch((error: { statusCode?: number }) => {
      if (error.statusCode !== 404) {
        throw error;
      }
    });
};
