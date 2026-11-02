/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { PROPOSALS_INDEX_NAME } from '@kbn/proposals-common';
import type { ProposalUser } from '@kbn/proposals-common';

interface EsLike {
  index(args: {
    index: string;
    document: Record<string, unknown>;
    refresh?: 'wait_for';
  }): Promise<{ _id: string }>;
  update(args: {
    index: string;
    id: string;
    doc: Record<string, unknown>;
    refresh?: 'wait_for';
  }): Promise<unknown>;
  deleteByQuery(args: {
    index: string;
    query: Record<string, unknown>;
    refresh?: boolean;
    conflicts?: 'proceed' | 'abort';
  }): Promise<unknown>;
}

export interface SeedApprovedProposalOptions {
  conversationId: string;
  title: string;
  decidedBy: ProposalUser;
}

/**
 * Write an approved proposal with no action to run (status `no_action`) to the index.
 * No API route creates this proposal without a workflow run.
 */
export const seedApprovedNoActionProposal = async (
  esClient: EsLike,
  { conversationId, title, decidedBy }: SeedApprovedProposalOptions
): Promise<string> => {
  const now = new Date().toISOString();
  const { _id: id } = await esClient.index({
    index: PROPOSALS_INDEX_NAME,
    document: {
      spaceId: 'default',
      conversationId,
      title,
      comment: 'Seeded by the AlertZero Scout suite',
      status: 'no_action',
      decision: 'approved',
      decidedBy,
      decidedAt: now,
      impact: 'low',
      confidence: 'medium',
      ranks: { impact: 3, confidence: 1 },
      category: 'configure',
      origin: 'alertzero',
      revision: 1,
      createdAt: now,
    },
    refresh: 'wait_for',
  });
  await esClient.update({
    index: PROPOSALS_INDEX_NAME,
    id,
    doc: { rootProposalId: id },
    refresh: 'wait_for',
  });
  return id;
};

export const cleanupProposalsOfConversation = async (
  esClient: EsLike,
  conversationId: string
): Promise<void> => {
  await esClient.deleteByQuery({
    index: PROPOSALS_INDEX_NAME,
    query: { term: { conversationId } },
    refresh: true,
    conflicts: 'proceed',
  });
};
