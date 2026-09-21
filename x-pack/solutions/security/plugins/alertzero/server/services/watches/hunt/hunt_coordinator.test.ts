/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import { huntCoordinator } from './hunt_coordinator';

jest.mock('./common/resolve_index_scope', () => ({
  resolveIndexScope: jest.fn().mockResolvedValue({
    technology: 'aws_iam',
    status: 'ok',
    required: ['logs-aws.cloudtrail-*'],
    optional: [],
    missing: [],
    window: { from: 'now-24h', to: 'now' },
    rowLimit: 100,
  }),
}));

jest.mock('./tier1/hunt_for_threat', () => ({
  huntForThreat: jest.fn().mockResolvedValue({
    status: 'no_environment_hits',
    hasConfirmedHit: false,
    searchedIocs: 0,
    searchedTechniques: 0,
    resolvedIocs: [],
    resolvedTechniques: [],
    timeRange: { from: 'now-24h', to: 'now' },
    counts: { totalHits: 0, returnedHits: 0, affectedHosts: 0, affectedUsers: 0 },
    hits: [],
    affectedAssets: { hosts: [], users: [] },
    perIndex: [],
  }),
}));

jest.mock('./tier2/hunt_behavior', () => ({
  huntBehavior: jest.fn().mockResolvedValue({
    status: 'no_behaviors_found',
    behaviors: [],
    indexed_behaviors: [],
    hasHit: false,
    next_step: 'Lower threshold.',
  }),
}));

const logger = {
  debug: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  info: jest.fn(),
} as unknown as import('@kbn/core/server').Logger;

const esClient = {} as ElasticsearchClient;

describe('huntCoordinator', () => {
  it('returns tier1_only with skip reason when no hits and tier2_when=on_hits', async () => {
    const result = await huntCoordinator(esClient, undefined, logger, {
      spaceId: 'default',
      trigger: 'scheduled',
      runId: 'run-1',
    });
    expect(result.status).toBe('tier1_only');
    expect(result.tier2_skipped_reason).toBe('no_environment_hits');
    expect(result.completedSuccessfully).toBe(true);
  });

  it('returns tier1_only with no_inference when model absent but hits present', async () => {
    const { huntForThreat: mockT1 } = jest.requireMock('./tier1/hunt_for_threat');
    mockT1.mockResolvedValueOnce({
      status: 'environment_hits_found',
      hasConfirmedHit: true,
      searchedIocs: 1,
      searchedTechniques: 0,
      resolvedIocs: [{ type: 'ip', value: '1.2.3.4' }],
      resolvedTechniques: [],
      timeRange: { from: 'now-24h', to: 'now' },
      counts: { totalHits: 5, returnedHits: 5, affectedHosts: 1, affectedUsers: 0 },
      hits: [],
      affectedAssets: { hosts: [{ name: 'host-1', hitCount: 5 }], users: [] },
      perIndex: [],
    });

    const result = await huntCoordinator(esClient, undefined, logger, {
      spaceId: 'default',
      trigger: 'scheduled',
      runId: 'run-2',
      text: 'some report text',
    });
    expect(result.status).toBe('tier1_only');
    expect(result.tier2_skipped_reason).toBe('no_inference');
    expect(result.completedSuccessfully).toBe(true);
  });

  it('returns tier1_only when text is absent', async () => {
    const { huntForThreat: mockT1 } = jest.requireMock('./tier1/hunt_for_threat');
    mockT1.mockResolvedValueOnce({
      status: 'environment_hits_found',
      hasConfirmedHit: true,
      searchedIocs: 1,
      searchedTechniques: 0,
      resolvedIocs: [],
      resolvedTechniques: [],
      timeRange: { from: 'now-24h', to: 'now' },
      counts: { totalHits: 1, returnedHits: 1, affectedHosts: 0, affectedUsers: 0 },
      hits: [],
      affectedAssets: { hosts: [], users: [] },
      perIndex: [],
    });

    const mockModel = {} as import('@kbn/agent-builder-server').ScopedModel;
    const result = await huntCoordinator(esClient, mockModel, logger, {
      spaceId: 'default',
      trigger: 'scheduled',
      runId: 'run-3',
      // no text
    });
    expect(result.tier2_skipped_reason).toBe('no_report_text');
  });

  it('never writes feedback — completedSuccessfully is the caller signal', async () => {
    const result = await huntCoordinator(esClient, undefined, logger, {
      spaceId: 'default',
      trigger: 'scheduled',
      runId: 'run-4',
    });
    expect(result).toHaveProperty('completedSuccessfully');
  });
});
