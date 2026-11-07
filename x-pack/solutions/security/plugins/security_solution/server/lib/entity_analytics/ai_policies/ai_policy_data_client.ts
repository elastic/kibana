/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v4 as uuidv4 } from 'uuid';
import type { ElasticsearchClient } from '@kbn/core/server';
import { MAX_AI_POLICIES } from '../../../../common/entity_intelligence/ai_policies';
import type {
  AiPolicy,
  AiPolicyInput,
  AiPoliciesResponse,
  UpdateAiPolicyRequest,
  AiPolicyDetectorHeartbeat,
  AiPolicyDetectorStatus,
  AiPolicyDetectorStatusResponse,
} from '../../../../common/entity_intelligence/ai_policies';

interface StoredPolicy {
  record_type: 'policy';
  space_id: string;
  updated_at: string;
  policy: AiPolicy;
}

interface StoredStatus {
  record_type: 'status';
  space_id: string;
  updated_at: string;
  heartbeat: AiPolicyDetectorStatus;
}

export class AiPolicyError extends Error {
  constructor(message: string, public readonly statusCode: 400 | 404 | 409 | 503) {
    super(message);
  }
}

const getEsErrorType = (error: {
  meta?: { body?: { error?: { type?: string } } };
}): string | undefined => error?.meta?.body?.error?.type;

/** Returns a single space's policy index, without accepting wildcard or index expressions. */
export const aiPoliciesIndex = (spaceId: string): string => {
  if (!/^[a-z0-9][a-z0-9_-]{0,63}$/.test(spaceId)) {
    throw new AiPolicyError('Invalid space ID.', 400);
  }
  return `.entity-intelligence-ai-policies-${spaceId}`;
};

export interface AiPolicyDataClient {
  listPolicies(): Promise<AiPoliciesResponse>;
  createPolicy(input: AiPolicyInput, username: string): Promise<AiPolicy>;
  updatePolicy(id: string, input: UpdateAiPolicyRequest, username: string): Promise<AiPolicy>;
  getStatus(): Promise<AiPolicyDetectorStatusResponse>;
  saveStatus(input: AiPolicyDetectorHeartbeat, username: string): Promise<AiPolicyDetectorStatus>;
}

/** Persists policies and collector health using the requesting user's Elasticsearch privileges. */
export const createAiPolicyDataClient = ({
  esClient,
  spaceId,
}: {
  esClient: ElasticsearchClient;
  spaceId: string;
}): AiPolicyDataClient => {
  const index = aiPoliciesIndex(spaceId);

  const ensureIndex = async (): Promise<void> => {
    if (await esClient.indices.exists({ index })) return;
    try {
      await esClient.indices.create({
        index,
        settings: { hidden: true },
        mappings: {
          dynamic: 'strict',
          properties: {
            record_type: { type: 'keyword' },
            space_id: { type: 'keyword' },
            updated_at: { type: 'date' },
            policy: { type: 'object', enabled: false },
            heartbeat: { type: 'object', enabled: false },
          },
        },
      });
    } catch (error) {
      if (getEsErrorType(error) !== 'resource_already_exists_exception') throw error;
    }
  };

  const listPolicies = async (): Promise<AiPoliciesResponse> => {
    try {
      const result = await esClient.search<StoredPolicy>({
        index,
        size: MAX_AI_POLICIES,
        allow_partial_search_results: false,
        track_total_hits: true,
        query: {
          bool: { filter: [{ term: { record_type: 'policy' } }, { term: { space_id: spaceId } }] },
        },
        sort: [{ updated_at: 'desc' }],
      });
      if (result.timed_out || result.terminated_early || result._shards.failed > 0) {
        throw new AiPolicyError(
          'Policy data is incomplete. Retry before evaluating agent activity.',
          503
        );
      }
      const total =
        typeof result.hits.total === 'number' ? result.hits.total : result.hits.total?.value ?? 0;
      if (total > MAX_AI_POLICIES) {
        throw new AiPolicyError(
          `More than ${MAX_AI_POLICIES} policies are stored in this space.`,
          409
        );
      }
      return {
        policies: result.hits.hits.flatMap(({ _source: doc }) =>
          doc?.space_id === spaceId && doc.record_type === 'policy' ? [doc.policy] : []
        ),
        total,
      };
    } catch (error) {
      if (getEsErrorType(error) === 'index_not_found_exception') return { policies: [], total: 0 };
      throw error;
    }
  };

  const createPolicy = async (input: AiPolicyInput, username: string): Promise<AiPolicy> => {
    const { total } = await listPolicies();
    if (total >= MAX_AI_POLICIES) {
      throw new AiPolicyError(`This space has reached the ${MAX_AI_POLICIES} policy limit.`, 409);
    }
    await ensureIndex();
    const now = new Date().toISOString();
    const policy: AiPolicy = {
      ...input,
      id: uuidv4(),
      version: 1,
      createdAt: now,
      updatedAt: now,
      effectiveFrom: now,
      createdBy: username,
      updatedBy: username,
    };
    await esClient.create({
      index,
      id: policy.id,
      document: { record_type: 'policy', space_id: spaceId, updated_at: now, policy },
      refresh: 'wait_for',
    });
    return policy;
  };

  const updatePolicy = async (
    id: string,
    input: UpdateAiPolicyRequest,
    username: string
  ): Promise<AiPolicy> => {
    try {
      const existing = await esClient.get<StoredPolicy>({ index, id });
      const doc = existing._source;
      if (!doc || doc.space_id !== spaceId || doc.record_type !== 'policy') {
        throw new AiPolicyError('Policy not found.', 404);
      }
      const { expectedVersion, ...updates } = input;
      if (expectedVersion !== doc.policy.version) {
        throw new AiPolicyError('The policy changed. Reload it before saving again.', 409);
      }
      const now = new Date().toISOString();
      const policy: AiPolicy = {
        ...updates,
        id,
        version: doc.policy.version + 1,
        createdAt: doc.policy.createdAt,
        createdBy: doc.policy.createdBy,
        updatedAt: now,
        updatedBy: username,
        effectiveFrom: now,
      };
      await esClient.index({
        index,
        id,
        if_seq_no: existing._seq_no,
        if_primary_term: existing._primary_term,
        document: { record_type: 'policy', space_id: spaceId, updated_at: now, policy },
        refresh: 'wait_for',
      });
      return policy;
    } catch (error) {
      if (error.statusCode === 404) throw new AiPolicyError('Policy not found.', 404);
      if (getEsErrorType(error) === 'version_conflict_engine_exception') {
        throw new AiPolicyError('The policy changed. Reload it before saving again.', 409);
      }
      throw error;
    }
  };

  const getStatus = async (): Promise<AiPolicyDetectorStatusResponse> => {
    try {
      const result = await esClient.get<StoredStatus>({ index, id: 'detector-status' });
      const doc = result._source;
      if (!doc || doc.space_id !== spaceId || doc.record_type !== 'status') {
        return { status: null, stale: true };
      }
      const { heartbeat: status } = doc;
      const newestRunAge = Date.now() - Date.parse(status.runCompletedAt);
      return { status, stale: newestRunAge > Math.max(60, status.intervalSeconds * 3) * 1000 };
    } catch (error) {
      if (error.statusCode === 404 || getEsErrorType(error) === 'index_not_found_exception') {
        return { status: null, stale: true };
      }
      throw error;
    }
  };

  const saveStatus = async (
    input: AiPolicyDetectorHeartbeat,
    username: string
  ): Promise<AiPolicyDetectorStatus> => {
    if (Date.parse(input.runCompletedAt) > Date.now() + 60_000) {
      throw new AiPolicyError('Collector completion time is in the future.', 400);
    }
    await ensureIndex();
    const status: AiPolicyDetectorStatus = {
      ...input,
      receivedAt: new Date().toISOString(),
      reportedBy: username,
    };
    await esClient.index({
      index,
      id: 'detector-status',
      document: {
        record_type: 'status',
        space_id: spaceId,
        updated_at: status.receivedAt,
        heartbeat: status,
      },
      refresh: 'wait_for',
    });
    return status;
  };

  return { listPolicies, createPolicy, updatePolicy, getStatus, saveStatus };
};
