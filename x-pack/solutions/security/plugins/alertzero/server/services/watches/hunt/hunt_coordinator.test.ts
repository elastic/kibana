/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import { loggingSystemMock } from '@kbn/core/server/mocks';
import { huntCoordinator } from './hunt_coordinator';

jest.mock('./common/resolve_index_scope', () => ({
  resolveHuntScope: jest.fn().mockResolvedValue({
    technologies: ['aws_iam'],
    status: 'ok',
    required: ['logs-aws.cloudtrail-*'],
    optional: [],
    missing: [],
    window: { from: 'now-24h', to: 'now' },
    rowLimit: 100,
  }),
}));

jest.mock('./common/load_report_context', () => ({
  loadReportHuntContext: jest.fn().mockResolvedValue({
    iocs: [{ type: 'ip', value: '192.0.2.30' }],
    techniques: ['T1078.004'],
    text: 'report body text',
  }),
}));

jest.mock('./tier1/hunt_for_threat', () => ({
  ...jest.requireActual('./tier1/hunt_for_threat'),
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
    affectedAssets: { hosts: [], users: [], services: [] },
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

const logger = loggingSystemMock.createLogger();

const esClient = {} as ElasticsearchClient;

describe('huntCoordinator', () => {
  it('returns tier1_only with skip reason when no hits and tier2_when=on_hits', async () => {
    const result = await huntCoordinator(esClient, undefined, logger, {
      spaceId: 'default',
      trigger: 'scheduled',
      runId: 'run-1',
      tier2_when: 'on_hits',
    });
    expect(result.status).toBe('tier1_only');
    expect(result.tier2_skipped_reason).toBe('no_environment_hits');
    expect(result.hasConfirmedHit).toBe(false);
    expect(result.completedSuccessfully).toBe(true);
  });

  it('defaults tier2_when to always so a no-hit run still attempts Tier 2', async () => {
    const result = await huntCoordinator(esClient, undefined, logger, {
      spaceId: 'default',
      trigger: 'scheduled',
      runId: 'run-default-always',
      text: 'report text',
    });
    expect(result.tier2_skipped_reason).toBe('no_inference');
    expect(result.hasConfirmedHit).toBe(false);
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
      affectedAssets: { hosts: [{ name: 'host-1', hitCount: 5 }], users: [], services: [] },
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
      affectedAssets: { hosts: [], users: [], services: [] },
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

  it('forwards an explicit technology to scope resolution', async () => {
    const { resolveHuntScope: mockScope } = jest.requireMock('./common/resolve_index_scope');
    await huntCoordinator(esClient, undefined, logger, {
      spaceId: 'default',
      trigger: 'scheduled',
      runId: 'run-5',
      technology: 'fortigate',
    });
    expect(mockScope).toHaveBeenCalledWith(
      expect.objectContaining({ spaceId: 'default', technology: 'fortigate' })
    );
  });

  it('reports the technologies the scope resolved to', async () => {
    const result = await huntCoordinator(esClient, undefined, logger, {
      spaceId: 'default',
      trigger: 'scheduled',
      runId: 'run-6',
    });
    expect(result.technologies).toEqual(['aws_iam']);
  });

  it('echoes the caller-supplied runId', async () => {
    const result = await huntCoordinator(esClient, undefined, logger, {
      spaceId: 'default',
      trigger: 'scheduled',
      runId: 'run-from-worker',
    });
    expect(result.runId).toBe('run-from-worker');
  });

  describe('when the scope is blocked', () => {
    let result: Awaited<ReturnType<typeof huntCoordinator>>;

    beforeEach(async () => {
      const { resolveHuntScope: mockScope } = jest.requireMock('./common/resolve_index_scope');
      const { huntForThreat: mockT1 } = jest.requireMock('./tier1/hunt_for_threat');
      mockT1.mockClear();
      mockScope.mockResolvedValueOnce({
        technologies: [],
        status: 'blocked',
        required: ['logs-aws.*', 'logs-fortinet.*'],
        optional: [],
        missing: ['logs-aws.*', 'logs-fortinet.*'],
        window: { from: 'now-24h', to: 'now' },
        rowLimit: 100,
      });
      result = await huntCoordinator(esClient, undefined, logger, {
        spaceId: 'default',
        trigger: 'scheduled',
        runId: 'run-7',
      });
    });

    it('returns a blocked status instead of a clean one', () => {
      expect(result.status).toBe('blocked');
    });

    it('does not report the run as completed, so no hunt evidence is written', () => {
      expect(result.completedSuccessfully).toBe(false);
    });

    it('names the skip reason', () => {
      expect(result.tier2_skipped_reason).toBe('scope_blocked');
    });

    it('marks Tier 1 as scope_blocked rather than no hits', () => {
      expect(result.tier1.status).toBe('scope_blocked');
    });

    it('never runs Tier 1', () => {
      const { huntForThreat: mockT1 } = jest.requireMock('./tier1/hunt_for_threat');
      expect(mockT1).not.toHaveBeenCalled();
    });
  });

  it('skips Tier 2 with configured_never and still completes', async () => {
    const result = await huntCoordinator(esClient, undefined, logger, {
      spaceId: 'default',
      trigger: 'scheduled',
      runId: 'run-8',
      tier2_when: 'never',
    });
    expect(result).toEqual(
      expect.objectContaining({
        tier2_skipped_reason: 'configured_never',
        completedSuccessfully: true,
      })
    );
  });

  it('skips Tier 2 on_hits when only optional indices matched (no confirmed hit)', async () => {
    const { huntForThreat: mockT1 } = jest.requireMock('./tier1/hunt_for_threat');
    const { huntBehavior: mockT2 } = jest.requireMock('./tier2/hunt_behavior');
    mockT2.mockClear();
    mockT1.mockResolvedValueOnce({
      status: 'environment_hits_found',
      hasConfirmedHit: false,
      searchedIocs: 1,
      searchedTechniques: 0,
      resolvedIocs: [],
      resolvedTechniques: [],
      timeRange: { from: 'now-24h', to: 'now' },
      counts: { totalHits: 3, returnedHits: 3, affectedHosts: 0, affectedUsers: 0 },
      hits: [],
      affectedAssets: { hosts: [], users: [], services: [] },
      perIndex: [{ index: '.alerts-security.alerts-default', hitCount: 3, required: false }],
    });
    const mockModel = {} as import('@kbn/agent-builder-server').ScopedModel;

    const result = await huntCoordinator(esClient, mockModel, logger, {
      spaceId: 'default',
      trigger: 'scheduled',
      runId: 'run-optional-only',
      text: 'report text',
      tier2_when: 'on_hits',
    });

    expect(result.tier2_skipped_reason).toBe('no_environment_hits');
    expect(mockT2).not.toHaveBeenCalled();
  });

  it('fails the run when Tier 2 throws', async () => {
    const { huntForThreat: mockT1 } = jest.requireMock('./tier1/hunt_for_threat');
    const { huntBehavior: mockT2 } = jest.requireMock('./tier2/hunt_behavior');
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
      affectedAssets: { hosts: [], users: [], services: [] },
      perIndex: [],
    });
    mockT2.mockRejectedValueOnce(new Error('connector down'));
    const mockModel = {} as import('@kbn/agent-builder-server').ScopedModel;

    const result = await huntCoordinator(esClient, mockModel, logger, {
      spaceId: 'default',
      trigger: 'scheduled',
      runId: 'run-9',
      text: 'report text',
    });
    expect(result).toEqual(
      expect.objectContaining({
        tier2_skipped_reason: 'tier2_failed',
        completedSuccessfully: false,
      })
    );
  });

  describe('a report-driven run', () => {
    beforeEach(() => {
      const { huntForThreat: mockT1 } = jest.requireMock('./tier1/hunt_for_threat');
      const { loadReportHuntContext: mockLoad } = jest.requireMock('./common/load_report_context');
      mockT1.mockClear();
      mockLoad.mockClear();
    });

    it("hunts the report's own IOCs and techniques when the caller passes only report_id", async () => {
      const { huntForThreat: mockT1 } = jest.requireMock('./tier1/hunt_for_threat');
      await huntCoordinator(esClient, undefined, logger, {
        report_id: 'rpt-1',
        spaceId: 'hunt-a',
        trigger: 'scheduled',
        runId: 'run-10',
      });
      expect(mockT1).toHaveBeenCalledWith(
        esClient,
        expect.objectContaining({
          iocs: [{ type: 'ip', value: '192.0.2.30' }],
          techniques: ['T1078.004'],
        })
      );
    });

    it('loads the report from the acting space', async () => {
      const { loadReportHuntContext: mockLoad } = jest.requireMock('./common/load_report_context');
      await huntCoordinator(esClient, undefined, logger, {
        report_id: 'rpt-1',
        spaceId: 'hunt-a',
        trigger: 'scheduled',
        runId: 'run-11',
      });
      expect(mockLoad).toHaveBeenCalledWith({ esClient, spaceId: 'hunt-a', reportId: 'rpt-1' });
    });

    it('lets caller-supplied IOCs win over the report', async () => {
      const { huntForThreat: mockT1 } = jest.requireMock('./tier1/hunt_for_threat');
      await huntCoordinator(esClient, undefined, logger, {
        report_id: 'rpt-1',
        spaceId: 'hunt-a',
        trigger: 'manual',
        runId: 'run-12',
        iocs: [{ type: 'domain', value: 'evil.example' }],
      });
      expect(mockT1).toHaveBeenCalledWith(
        esClient,
        expect.objectContaining({ iocs: [{ type: 'domain', value: 'evil.example' }] })
      );
    });

    it('does not read the report when no report_id is given', async () => {
      const { loadReportHuntContext: mockLoad } = jest.requireMock('./common/load_report_context');
      await huntCoordinator(esClient, undefined, logger, {
        spaceId: 'hunt-a',
        trigger: 'scheduled',
        runId: 'run-13',
      });
      expect(mockLoad).not.toHaveBeenCalled();
    });

    it('fails the run, never clean, when the report is not in the space', async () => {
      const { loadReportHuntContext: mockLoad } = jest.requireMock('./common/load_report_context');
      mockLoad.mockResolvedValueOnce(null);
      const result = await huntCoordinator(esClient, undefined, logger, {
        report_id: 'rpt-elsewhere',
        spaceId: 'hunt-a',
        trigger: 'scheduled',
        runId: 'run-14',
      });
      expect(result).toEqual(
        expect.objectContaining({
          tier2_skipped_reason: 'report_not_found',
          completedSuccessfully: false,
        })
      );
    });
  });

  it('returns hasConfirmedHit true when Tier 2 alone hits', async () => {
    const { huntForThreat: mockT1 } = jest.requireMock('./tier1/hunt_for_threat');
    const { huntBehavior: mockT2 } = jest.requireMock('./tier2/hunt_behavior');
    mockT1.mockResolvedValueOnce({
      status: 'no_environment_hits',
      hasConfirmedHit: false,
      searchedIocs: 0,
      searchedTechniques: 1,
      resolvedIocs: [],
      resolvedTechniques: ['T1078.004'],
      timeRange: { from: 'now-30d', to: 'now' },
      counts: { totalHits: 0, returnedHits: 0, affectedHosts: 0, affectedUsers: 0 },
      hits: [],
      affectedAssets: { hosts: [], users: [], services: [] },
      perIndex: [],
    });
    mockT2.mockResolvedValueOnce({
      status: 'behaviors_proposed',
      behaviors: [
        {
          technique_id: 'T1078.004',
          execution: { executed: true, row_count: 2, hit: true },
        },
      ],
      indexed_behaviors: [],
      hasHit: true,
      next_step: 'hit',
    });
    const mockModel = {} as import('@kbn/agent-builder-server').ScopedModel;

    const result = await huntCoordinator(esClient, mockModel, logger, {
      spaceId: 'default',
      trigger: 'scheduled',
      runId: 'run-t2-only-hit',
      text: 'report text',
    });

    expect(result.hasConfirmedHit).toBe(true);
  });

  it('forwards the Tier 1 window into huntBehavior for execute', async () => {
    const { huntForThreat: mockT1 } = jest.requireMock('./tier1/hunt_for_threat');
    const { huntBehavior: mockT2 } = jest.requireMock('./tier2/hunt_behavior');
    mockT2.mockClear();
    mockT1.mockResolvedValueOnce({
      status: 'no_environment_hits',
      hasConfirmedHit: false,
      searchedIocs: 0,
      searchedTechniques: 0,
      resolvedIocs: [],
      resolvedTechniques: [],
      timeRange: { from: 'now-7d', to: 'now' },
      counts: { totalHits: 0, returnedHits: 0, affectedHosts: 0, affectedUsers: 0 },
      hits: [],
      affectedAssets: { hosts: [], users: [], services: [] },
      perIndex: [],
    });
    const mockModel = {} as import('@kbn/agent-builder-server').ScopedModel;

    await huntCoordinator(esClient, mockModel, logger, {
      spaceId: 'default',
      trigger: 'scheduled',
      runId: 'run-window-forward',
      text: 'report text',
      size: 40,
    });

    expect(mockT2).toHaveBeenCalledWith(
      mockModel,
      logger,
      expect.objectContaining({
        window: { from: 'now-7d', to: 'now' },
        size: 40,
        row_limit: 100,
        required_indices: ['logs-aws.cloudtrail-*'],
      }),
      esClient
    );
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
