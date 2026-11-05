/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { PROPOSALS_INDEX_NAME } from '@kbn/proposals-common';
import type { ProposalUser } from '@kbn/proposals-common';

interface EsLike {
  indices: {
    existsIndexTemplate(args: { name: string }): Promise<boolean>;
    putIndexTemplate(args: {
      name: string;
      create: boolean;
      allow_auto_create: boolean;
      index_patterns: string[];
      template: Record<string, unknown>;
    }): Promise<unknown>;
    create(args: { index: string }): Promise<unknown>;
  };
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

const KEYWORD_FIELDS = [
  'spaceId',
  'conversationId',
  'actionWorkflowId',
  'status',
  'decision',
  'supersededBy',
  'rootProposalId',
  'supersedes',
  'impact',
  'confidence',
  'category',
  'origin',
  'decisionMode',
  'dismissReason',
  'workflowExecutionId',
];
const DATE_FIELDS = ['expiresAt', 'decidedAt', 'gateReleasedAt', 'createdAt'];
const TEXT_FIELDS = ['title', 'comment', 'rationale', 'executionError', 'previousExecutionError'];
const USER_MAPPING = {
  properties: Object.fromEntries(
    ['username', 'fullName', 'email', 'profileUid'].map((field) => [field, { type: 'keyword' }])
  ),
};

const mappingsOf = (fields: readonly string[], mapping: Record<string, string>) =>
  Object.fromEntries(fields.map((field) => [field, mapping]));

const isAlreadyExists = (error: unknown): boolean =>
  error instanceof Error && /already[ _]exists/i.test(error.message);

/**
 * Kibana creates the index template, the backing index and the alias on its first proposal write.
 * A raw write into a missing alias creates a plain index of the same name, and the list API then
 * fails on its dynamic mappings. Install the template and the backing index first. This mirrors
 * `proposals_storage.ts`, as the proposals Scout suite does. Never replace a template that exists,
 * because Kibana owns it.
 */
const ensureProposalsStorage = async (esClient: EsLike): Promise<void> => {
  if (!(await esClient.indices.existsIndexTemplate({ name: PROPOSALS_INDEX_NAME }))) {
    await esClient.indices
      .putIndexTemplate({
        name: PROPOSALS_INDEX_NAME,
        create: true,
        allow_auto_create: false,
        index_patterns: [`${PROPOSALS_INDEX_NAME}-*`],
        template: {
          mappings: {
            dynamic: 'strict',
            properties: {
              ...mappingsOf(KEYWORD_FIELDS, { type: 'keyword' }),
              ...mappingsOf(DATE_FIELDS, { type: 'date', format: 'strict_date_optional_time' }),
              ...mappingsOf(TEXT_FIELDS, { type: 'text' }),
              actionInput: { type: 'flattened' },
              revision: { type: 'long' },
              ranks: { properties: { impact: { type: 'byte' }, confidence: { type: 'byte' } } },
              decidedBy: USER_MAPPING,
              createdBy: USER_MAPPING,
            },
          },
          aliases: { [PROPOSALS_INDEX_NAME]: { is_write_index: true } },
        },
      })
      .catch((error: unknown) => {
        if (!isAlreadyExists(error)) {
          throw error;
        }
      });
  }
  await esClient.indices.create({ index: `${PROPOSALS_INDEX_NAME}-000001` }).catch((error) => {
    if (!isAlreadyExists(error)) {
      throw error;
    }
  });
};

/**
 * Write an approved proposal with no action to run (status `no_action`) to the index.
 * No API route creates this proposal without a workflow run.
 */
export const seedApprovedNoActionProposal = async (
  esClient: EsLike,
  { conversationId, title, decidedBy }: SeedApprovedProposalOptions
): Promise<string> => {
  await ensureProposalsStorage(esClient);
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
