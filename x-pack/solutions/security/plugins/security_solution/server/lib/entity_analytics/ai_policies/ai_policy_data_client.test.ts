/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { elasticsearchServiceMock } from '@kbn/core/server/mocks';
import type {
  AiPolicy,
  AiPolicyInput,
  AiPolicyDetectorHeartbeat,
} from '../../../../common/entity_intelligence/ai_policies';
import { aiPoliciesIndex, createAiPolicyDataClient } from './ai_policy_data_client';

const input: AiPolicyInput = {
  name: 'Protected fixture',
  description: 'Detect access to the fixture',
  enabled: true,
  mode: 'monitor',
  providers: ['cursor', 'agent_builder'],
  activityType: 'protected_file_access',
  severity: 'high',
  toolNames: [],
  inputContains: 'protected-fixture.txt',
};
const oldTime = '2026-10-14T10:00:00.000Z';
const now = '2026-10-14T12:00:00.000Z';
const policy: AiPolicy = {
  ...input,
  id: 'fd451a56-0cb7-4cac-8e72-fa8679b035bd',
  version: 1,
  createdAt: oldTime,
  updatedAt: oldTime,
  effectiveFrom: oldTime,
  createdBy: 'creator',
  updatedBy: 'creator',
};
const heartbeat: AiPolicyDetectorHeartbeat = {
  collectorId: 'local-monitor',
  runStartedAt: now,
  runCompletedAt: now,
  intervalSeconds: 15,
  policiesLoaded: 1,
  sources: [{ provider: 'cursor', status: 'healthy', observationsScanned: 2, findingsCreated: 1 }],
};

describe('AI policy persistence', () => {
  const esClient = elasticsearchServiceMock.createElasticsearchClient();
  const client = createAiPolicyDataClient({ esClient, spaceId: 'research' });
  const index = '.entity-intelligence-ai-policies-research';

  beforeEach(() => {
    jest.resetAllMocks();
    jest.useFakeTimers().setSystemTime(new Date(now));
    esClient.indices.exists.mockResolvedValue(true);
    esClient.search.mockResolvedValue({
      timed_out: false,
      _shards: { failed: 0 },
      hits: { total: { value: 0 }, hits: [] },
    } as never);
    esClient.get.mockResolvedValue({
      _seq_no: 7,
      _primary_term: 2,
      _source: { record_type: 'policy', space_id: 'research', policy },
    } as never);
  });

  afterEach(() => jest.useRealTimers());

  it('stores a policy with server audit fields in the current space index', async () => {
    const created = await client.createPolicy(input, 'analyst');
    expect(created).toEqual({
      ...input,
      id: expect.any(String),
      version: 1,
      createdAt: now,
      updatedAt: now,
      effectiveFrom: now,
      createdBy: 'analyst',
      updatedBy: 'analyst',
    });
    expect(esClient.create).toHaveBeenCalledWith({
      index,
      id: created.id,
      document: { record_type: 'policy', space_id: 'research', updated_at: now, policy: created },
      refresh: 'wait_for',
    });
  });

  it('retains the original author while versioning edits and advancing their effective time', async () => {
    const updated = await client.updatePolicy(
      policy.id,
      { ...input, enabled: false, expectedVersion: 1 },
      'editor'
    );
    expect(updated).toMatchObject({
      version: 2,
      enabled: false,
      createdAt: oldTime,
      createdBy: 'creator',
      updatedAt: now,
      updatedBy: 'editor',
      effectiveFrom: now,
    });
    expect(esClient.index).toHaveBeenCalledWith(
      expect.objectContaining({
        index,
        if_seq_no: 7,
        if_primary_term: 2,
      })
    );
  });

  it('rejects a stale expected version before writing', async () => {
    await expect(
      client.updatePolicy(policy.id, { ...input, expectedVersion: 2 }, 'editor')
    ).rejects.toMatchObject({ statusCode: 409 });
    expect(esClient.index).not.toHaveBeenCalled();
  });

  it('returns conflict if another edit wins after the read', async () => {
    esClient.index.mockRejectedValue({
      statusCode: 409,
      meta: { body: { error: { type: 'version_conflict_engine_exception' } } },
    });
    await expect(
      client.updatePolicy(policy.id, { ...input, expectedVersion: 1 }, 'editor')
    ).rejects.toMatchObject({ statusCode: 409 });
  });

  it('does not expose or overwrite a policy from another space', async () => {
    esClient.get.mockResolvedValue({
      _source: { record_type: 'policy', space_id: 'other-space', policy },
    } as never);
    await expect(
      client.updatePolicy(policy.id, { ...input, expectedVersion: 1 }, 'editor')
    ).rejects.toMatchObject({ statusCode: 404 });
    expect(esClient.index).not.toHaveBeenCalled();
  });

  it('returns empty only for a missing index, never for a read permissions error', async () => {
    esClient.search.mockRejectedValueOnce({
      meta: { body: { error: { type: 'index_not_found_exception' } } },
    });
    expect(await client.listPolicies()).toEqual({ policies: [], total: 0 });
    const denied = { statusCode: 403, meta: { body: { error: { type: 'security_exception' } } } };
    esClient.search.mockRejectedValueOnce(denied);
    await expect(client.listPolicies()).rejects.toEqual(denied);
  });

  it('always filters by space and rejects more policies than the detector can load', async () => {
    await client.listPolicies();
    expect(esClient.search).toHaveBeenCalledWith(
      expect.objectContaining({
        index,
        allow_partial_search_results: false,
        query: {
          bool: {
            filter: [{ term: { record_type: 'policy' } }, { term: { space_id: 'research' } }],
          },
        },
      })
    );
    esClient.search.mockResolvedValue({
      timed_out: false,
      _shards: { failed: 0 },
      hits: { total: { value: 501 }, hits: [] },
    } as never);
    await expect(client.listPolicies()).rejects.toMatchObject({ statusCode: 409 });
  });

  it.each([
    { timed_out: true, terminated_early: false, _shards: { failed: 0 } },
    { timed_out: false, terminated_early: false, _shards: { failed: 1 } },
    { timed_out: false, terminated_early: true, _shards: { failed: 0 } },
  ])('rejects incomplete policy searches instead of reporting no policies: %j', async (result) => {
    esClient.search.mockResolvedValue({
      ...result,
      hits: { total: { value: 0 }, hits: [] },
    } as never);
    await expect(client.listPolicies()).rejects.toMatchObject({ statusCode: 503 });
    await expect(client.createPolicy(input, 'analyst')).rejects.toMatchObject({ statusCode: 503 });
    expect(esClient.create).not.toHaveBeenCalled();
  });

  it('reports missing and stale collector runs honestly', async () => {
    esClient.get.mockRejectedValueOnce({ statusCode: 404 });
    expect(await client.getStatus()).toEqual({ status: null, stale: true });
    const status = {
      ...heartbeat,
      runStartedAt: oldTime,
      runCompletedAt: oldTime,
      receivedAt: now,
      reportedBy: 'collector-user',
    };
    esClient.get.mockResolvedValue({
      _source: { record_type: 'status', space_id: 'research', heartbeat: status },
    } as never);
    expect(await client.getStatus()).toEqual({ status, stale: true });
  });

  it('persists a bounded heartbeat with its actual authenticated reporter', async () => {
    const status = await client.saveStatus(heartbeat, 'collector-user');
    expect(status).toEqual({ ...heartbeat, receivedAt: now, reportedBy: 'collector-user' });
    expect(esClient.index).toHaveBeenCalledWith(
      expect.objectContaining({ index, id: 'detector-status' })
    );
  });

  it('rejects future run timestamps rather than reporting a fresh collector indefinitely', async () => {
    await expect(
      client.saveStatus(
        { ...heartbeat, runCompletedAt: '2026-10-15T12:00:00.000Z' },
        'collector-user'
      )
    ).rejects.toMatchObject({ statusCode: 400 });
    expect(esClient.index).not.toHaveBeenCalled();
  });

  it('rejects index expressions in a space name', () => {
    expect(() => aiPoliciesIndex('default,other')).toThrow('Invalid space ID.');
    expect(() => aiPoliciesIndex('*')).toThrow('Invalid space ID.');
  });
});
