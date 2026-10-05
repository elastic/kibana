/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import { loggingSystemMock } from '@kbn/core/server/mocks';
import { huntCoordinator } from './hunt_coordinator';
import { SUMMARIZE_HIT_SOURCE_FIELDS } from './common/summarize_hit';

/** The universe the routes hand the coordinator: the space's default data view. */
const INDEX_PATTERNS = ['logs-*', 'filebeat-*', '-*elastic-cloud-logs-*'];

/** Stage 1's answer: one universe, the CloudTrail dataset matched by the report, nothing actionable. */
const okScope = {
  status: 'ok',
  resolution: 'universe',
  index_patterns: INDEX_PATTERNS,
  missing: [],
  discovered: [],
  report_matches: ['logs-aws.cloudtrail-*'],
  actionable_indices: [],
  window: { from: 'now-24h', to: 'now' },
  row_limit: 100,
};

jest.mock('./common/resolve_index_scope', () => ({
  resolveHuntScope: jest.fn(),
}));

jest.mock('./common/match_hunt_datasets', () => ({
  ...jest.requireActual('./common/match_hunt_datasets'),
  matchDatasetsWithModel: jest.fn().mockResolvedValue(undefined),
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
    has_confirmed_hit: false,
    searched_iocs: 0,
    searched_techniques: 0,
    resolved_iocs: [],
    resolved_techniques: [],
    time_range: { from: 'now-24h', to: 'now' },
    counts: { total_hits: 0, returned_hits: 0, affected_hosts: 0, affected_users: 0 },
    hits: [],
    affected_assets: { hosts: [], users: [], services: [] },
    per_index: [],
  }),
}));

jest.mock('./tier2/hunt_behavior', () => ({
  huntBehavior: jest.fn().mockResolvedValue({
    status: 'no_behaviors_found',
    behaviors: [],
    indexed_behaviors: [],
    has_hit: false,
    next_step: 'Lower threshold.',
  }),
}));

/** Stage 1's answer when nothing in the universe is visible to this hunt. */
const blockedScope = (resolution: string): Record<string, unknown> => ({
  status: 'blocked',
  resolution,
  index_patterns: [],
  missing: INDEX_PATTERNS.filter((pattern) => !pattern.startsWith('-')),
  discovered: [],
  report_matches: [],
  actionable_indices: [],
  window: { from: 'now-24h', to: 'now' },
  row_limit: 100,
});

const logger = loggingSystemMock.createLogger();

const esClient = {} as ElasticsearchClient;

describe('huntCoordinator', () => {
  beforeEach(() => {
    const { resolveHuntScope: mockScope } = jest.requireMock('./common/resolve_index_scope');
    mockScope.mockReset();
    mockScope.mockResolvedValue(okScope);
  });

  it('returns tier1_only with skip reason when no hits and tier2_when=on_hits', async () => {
    const result = await huntCoordinator(
      { esClient, reportsEsClient: esClient },
      undefined,
      logger,
      {
        spaceId: 'default',
        indexPatterns: INDEX_PATTERNS,
        trigger: 'scheduled',
        run_id: 'run-1',
        tier2_when: 'on_hits',
      }
    );
    expect(result.status).toBe('tier1_only');
    expect(result.tier2_skipped_reason).toBe('no_environment_hits');
    expect(result.has_confirmed_hit).toBe(false);
    expect(result.completed_successfully).toBe(true);
  });

  it('defaults tier2_when to always so a no-hit run still attempts Tier 2', async () => {
    const result = await huntCoordinator(
      { esClient, reportsEsClient: esClient },
      undefined,
      logger,
      {
        spaceId: 'default',
        indexPatterns: INDEX_PATTERNS,
        trigger: 'scheduled',
        run_id: 'run-default-always',
        text: 'report text',
      }
    );
    expect(result.tier2_skipped_reason).toBe('no_inference');
    expect(result.has_confirmed_hit).toBe(false);
  });

  it('returns tier1_only with no_inference when model absent but hits present', async () => {
    const { huntForThreat: mockT1 } = jest.requireMock('./tier1/hunt_for_threat');
    mockT1.mockResolvedValueOnce({
      status: 'environment_hits_found',
      has_confirmed_hit: true,
      searched_iocs: 1,
      searched_techniques: 0,
      resolved_iocs: [{ type: 'ip', value: '1.2.3.4' }],
      resolved_techniques: [],
      time_range: { from: 'now-24h', to: 'now' },
      counts: { total_hits: 5, returned_hits: 5, affected_hosts: 1, affected_users: 0 },
      hits: [],
      affected_assets: { hosts: [{ name: 'host-1', hit_count: 5 }], users: [], services: [] },
      per_index: [],
    });

    const result = await huntCoordinator(
      { esClient, reportsEsClient: esClient },
      undefined,
      logger,
      {
        spaceId: 'default',
        indexPatterns: INDEX_PATTERNS,
        trigger: 'scheduled',
        run_id: 'run-2',
        text: 'some report text',
      }
    );
    expect(result.status).toBe('tier1_only');
    expect(result.tier2_skipped_reason).toBe('no_inference');
    // Tier 1 searched, so a caller could be forgiven for reading this as a complete
    // run — and that is the trap. Tier 2 was requested and never ran, so the report's
    // behavioral techniques were not hunted at all. Configuring a connector is all it
    // takes for the next run to cover them, so the report has to stay eligible.
    expect(result.completeness).toBe('incomplete_retryable');
    expect(result.completed_successfully).toBe(false);
  });

  it('returns tier1_only when text is absent', async () => {
    const { huntForThreat: mockT1 } = jest.requireMock('./tier1/hunt_for_threat');
    mockT1.mockResolvedValueOnce({
      status: 'environment_hits_found',
      has_confirmed_hit: true,
      searched_iocs: 1,
      searched_techniques: 0,
      resolved_iocs: [],
      resolved_techniques: [],
      time_range: { from: 'now-24h', to: 'now' },
      counts: { total_hits: 1, returned_hits: 1, affected_hosts: 0, affected_users: 0 },
      hits: [],
      affected_assets: { hosts: [], users: [], services: [] },
      per_index: [],
    });

    const mockModel = {} as import('@kbn/agent-builder-server').ScopedModel;
    const result = await huntCoordinator(
      { esClient, reportsEsClient: esClient },
      mockModel,
      logger,
      {
        spaceId: 'default',
        indexPatterns: INDEX_PATTERNS,
        trigger: 'scheduled',
        run_id: 'run-3',
        // no text
      }
    );
    expect(result.tier2_skipped_reason).toBe('no_report_text');
  });

  it("hands scope resolution the caller's universe, and no technology or model", async () => {
    const { resolveHuntScope: mockScope } = jest.requireMock('./common/resolve_index_scope');
    await huntCoordinator({ esClient, reportsEsClient: esClient }, undefined, logger, {
      spaceId: 'default',
      indexPatterns: INDEX_PATTERNS,
      trigger: 'scheduled',
      run_id: 'run-5',
    });
    expect(mockScope).toHaveBeenCalledWith(
      expect.objectContaining({ spaceId: 'default', indexPatterns: INDEX_PATTERNS })
    );
    expect(mockScope.mock.calls[0][0]).not.toHaveProperty('technology');
    expect(mockScope.mock.calls[0][0]).not.toHaveProperty('model');
  });

  it('reports the actionable indices the scope named, and never a technologies list', async () => {
    const { resolveHuntScope: mockScope } = jest.requireMock('./common/resolve_index_scope');
    mockScope.mockResolvedValueOnce({
      ...okScope,
      actionable_indices: ['logs-endpoint.events.process-default*'],
    });
    const result = await huntCoordinator(
      { esClient, reportsEsClient: esClient },
      undefined,
      logger,
      {
        spaceId: 'default',
        indexPatterns: INDEX_PATTERNS,
        trigger: 'scheduled',
        run_id: 'run-6',
      }
    );
    expect(result.actionable_indices).toEqual(['logs-endpoint.events.process-default*']);
    expect(result).not.toHaveProperty('technologies');
  });

  it('derives the Investigation headline and narrative from the outcome, naming the report', async () => {
    const { loadReportHuntContext: mockLoad } = jest.requireMock('./common/load_report_context');
    mockLoad.mockResolvedValueOnce({
      iocs: [{ type: 'ip', value: '192.0.2.30' }],
      techniques: ['T1078.004'],
      text: 'report body text',
      title: 'CloudTrail retrospective',
    });

    const result = await huntCoordinator(
      { esClient, reportsEsClient: esClient },
      undefined,
      logger,
      {
        spaceId: 'default',
        indexPatterns: INDEX_PATTERNS,
        trigger: 'scheduled',
        run_id: 'run-narrative',
        report_id: 'rpt-1',
        tier2_when: 'on_hits',
      }
    );

    expect(result.headline).toBe('no confirmed hits: Tier 1 found no matches; Tier 2 skipped');
    expect(result.narrative).toContain(
      '### Hunt Watch found no confirmed hits\n\nHunt Watch found no confirmed hits for threat report **"CloudTrail retrospective"** (`rpt-1`).'
    );
    expect(result.narrative).toContain(
      '- **Indices:** `logs-*`, `filebeat-*` and `-*elastic-cloud-logs-*`'
    );
    expect(result.narrative).toContain(
      "- **Tier 2 targets:** `logs-aws.cloudtrail-*` (from the report's vendor or product)"
    );
    expect(result.narrative).not.toMatch(/technolog/i);
    expect(result.narrative).toContain('only escalates to Tier 2 on a hit');
    expect(result.narrative).toContain('_Hunt run `run-narrative`._');
  });

  it('reports the index patterns the scope resolved to', async () => {
    const result = await huntCoordinator(
      { esClient, reportsEsClient: esClient },
      undefined,
      logger,
      {
        spaceId: 'default',
        indexPatterns: INDEX_PATTERNS,
        trigger: 'scheduled',
        run_id: 'run-6-patterns',
      }
    );
    expect(result.index_patterns).toEqual(INDEX_PATTERNS);
  });

  it('reports the stage 2 union with its sources, and hands it to huntBehavior as allowed_indices', async () => {
    const { resolveHuntScope: mockScope } = jest.requireMock('./common/resolve_index_scope');
    const { huntBehavior: mockT2 } = jest.requireMock('./tier2/hunt_behavior');
    mockScope.mockResolvedValueOnce({
      ...okScope,
      actionable_indices: ['logs-endpoint.events.process-default*'],
    });
    const mockModel = {} as import('@kbn/agent-builder-server').ScopedModel;

    const result = await huntCoordinator(
      { esClient, reportsEsClient: esClient },
      mockModel,
      logger,
      {
        spaceId: 'default',
        indexPatterns: INDEX_PATTERNS,
        trigger: 'scheduled',
        run_id: 'run-tier2-targets',
        text: 'report text',
      }
    );

    expect(result.index_patterns).toEqual(INDEX_PATTERNS);
    expect(result.tier2_targets).toEqual([
      'logs-aws.cloudtrail-*',
      'logs-endpoint.events.process-default*',
    ]);
    expect(result.tier2_target_sources).toEqual(['report_match', 'actionable']);
    expect(mockT2).toHaveBeenCalledWith(
      mockModel,
      logger,
      expect.objectContaining({
        allowed_indices: ['logs-aws.cloudtrail-*', 'logs-endpoint.events.process-default*'],
      }),
      esClient
    );
  });

  describe('what scope resolution is handed', () => {
    const { resolveHuntScope: mockScope } = jest.requireMock('./common/resolve_index_scope');
    const { loadReportHuntContext: mockLoad } = jest.requireMock('./common/load_report_context');

    beforeEach(() => {
      mockScope.mockClear();
    });

    it('passes the report context so the report can be matched against the datasets in the universe', async () => {
      mockLoad.mockResolvedValueOnce({
        iocs: [{ type: 'ip', value: '192.0.2.30' }],
        techniques: ['T1078.004'],
        text: 'report body text',
        vendor: 'Fortinet',
        product: 'FortiOS',
      });
      const mockModel = {} as import('@kbn/agent-builder-server').ScopedModel;

      await huntCoordinator({ esClient, reportsEsClient: esClient }, mockModel, logger, {
        report_id: 'rpt-1',
        spaceId: 'hunt-a',
        indexPatterns: INDEX_PATTERNS,
        trigger: 'scheduled',
        run_id: 'run-scope-report',
      });

      expect(mockScope).toHaveBeenCalledWith({
        esClient,
        spaceId: 'hunt-a',
        indexPatterns: INDEX_PATTERNS,
        report: {
          vendor: 'Fortinet',
          product: 'FortiOS',
          text: 'report body text',
          iocs: [{ type: 'ip', value: '192.0.2.30' }],
          techniques: ['T1078.004'],
        },
        logger,
      });
    });

    it('hands scope resolution only the IOCs Tier 1 can query, so an IOC no search would use carries no weight in matching', async () => {
      mockLoad.mockResolvedValueOnce({
        // Six hex characters is no md5, sha1, or sha256; Tier 1 builds no clause for it.
        iocs: [
          { type: 'hash', value: 'abcdef' },
          { type: 'ip', value: '192.0.2.30' },
        ],
        techniques: [],
        text: 'report body text',
      });

      await huntCoordinator({ esClient, reportsEsClient: esClient }, undefined, logger, {
        report_id: 'rpt-hash',
        spaceId: 'hunt-a',
        indexPatterns: INDEX_PATTERNS,
        trigger: 'scheduled',
        run_id: 'run-scope-hash',
      });

      expect(mockScope).toHaveBeenCalledWith(
        expect.objectContaining({
          report: expect.objectContaining({ iocs: [{ type: 'ip', value: '192.0.2.30' }] }),
        })
      );
    });

    it('hands over what the caller supplied when the caller overrode the report', async () => {
      mockLoad.mockResolvedValueOnce({
        iocs: [{ type: 'ip', value: '192.0.2.30' }],
        techniques: ['T1078.004'],
        text: 'report body text',
        vendor: 'Fortinet',
      });

      await huntCoordinator({ esClient, reportsEsClient: esClient }, undefined, logger, {
        report_id: 'rpt-1',
        spaceId: 'hunt-a',
        indexPatterns: INDEX_PATTERNS,
        trigger: 'manual',
        run_id: 'run-scope-caller-wins',
        iocs: [{ type: 'domain', value: 'evil.example' }],
        text: 'caller text',
      });

      expect(mockScope).toHaveBeenCalledWith(
        expect.objectContaining({
          report: {
            vendor: 'Fortinet',
            product: undefined,
            text: 'caller text',
            iocs: [{ type: 'domain', value: 'evil.example' }],
            techniques: ['T1078.004'],
          },
        })
      );
    });

    it('passes no report on a bare call with neither a report id nor caller inputs', async () => {
      await huntCoordinator({ esClient, reportsEsClient: esClient }, undefined, logger, {
        spaceId: 'default',
        indexPatterns: INDEX_PATTERNS,
        trigger: 'scheduled',
        run_id: 'run-scope-bare',
      });

      expect(mockScope).toHaveBeenCalledWith(
        expect.objectContaining({ spaceId: 'default', report: undefined })
      );
    });

    it('still passes the caller inputs as the report context without a report id', async () => {
      await huntCoordinator({ esClient, reportsEsClient: esClient }, undefined, logger, {
        spaceId: 'default',
        indexPatterns: INDEX_PATTERNS,
        trigger: 'manual',
        run_id: 'run-scope-adhoc',
        techniques: ['T1566'],
      });

      expect(mockScope).toHaveBeenCalledWith(
        expect.objectContaining({
          report: {
            vendor: undefined,
            product: undefined,
            text: undefined,
            iocs: [],
            techniques: ['T1566'],
          },
        })
      );
    });
  });

  it('echoes the caller-supplied run_id', async () => {
    const result = await huntCoordinator(
      { esClient, reportsEsClient: esClient },
      undefined,
      logger,
      {
        spaceId: 'default',
        indexPatterns: INDEX_PATTERNS,
        trigger: 'scheduled',
        run_id: 'run-from-worker',
      }
    );
    expect(result.run_id).toBe('run-from-worker');
  });

  describe('when the scope is blocked', () => {
    let result: Awaited<ReturnType<typeof huntCoordinator>>;

    beforeEach(async () => {
      const { resolveHuntScope: mockScope } = jest.requireMock('./common/resolve_index_scope');
      const { huntForThreat: mockT1 } = jest.requireMock('./tier1/hunt_for_threat');
      mockT1.mockClear();
      mockScope.mockResolvedValueOnce(blockedScope('blocked:empty_universe'));
      result = await huntCoordinator({ esClient, reportsEsClient: esClient }, undefined, logger, {
        spaceId: 'default',
        indexPatterns: INDEX_PATTERNS,
        trigger: 'scheduled',
        run_id: 'run-7',
      });
    });

    it('returns a blocked status instead of a clean one', () => {
      expect(result.status).toBe('blocked');
    });

    it('reports no index patterns, since nothing was hunted', () => {
      expect(result.index_patterns).toEqual([]);
    });

    it('reports no Tier 2 targets, sources, or actionable indices', () => {
      expect(result.tier2_targets).toEqual([]);
      expect(result.tier2_target_sources).toEqual([]);
      expect(result.actionable_indices).toEqual([]);
    });

    it('does not report the run as completed, so no hunt evidence is written', () => {
      expect(result.completed_successfully).toBe(false);
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

  describe('what a blocked scope tells the caller', () => {
    const { resolveHuntScope: mockScope } = jest.requireMock('./common/resolve_index_scope');

    const runBlocked = async (resolution: string, params: Record<string, unknown> = {}) => {
      mockScope.mockResolvedValueOnce(blockedScope(resolution));
      return huntCoordinator({ esClient, reportsEsClient: esClient }, undefined, logger, {
        spaceId: 'default',
        indexPatterns: INDEX_PATTERNS,
        trigger: 'scheduled',
        run_id: `run-${resolution}`,
        iocs: [{ type: 'ip', value: '203.0.113.10' }],
        ...params,
      });
    };

    it('reports no index patterns on the wire even when the blocked scope carried some', async () => {
      mockScope.mockResolvedValueOnce({
        ...blockedScope('blocked:empty_universe'),
        index_patterns: INDEX_PATTERNS,
      });
      const result = await huntCoordinator(
        { esClient, reportsEsClient: esClient },
        undefined,
        logger,
        {
          spaceId: 'default',
          indexPatterns: INDEX_PATTERNS,
          trigger: 'scheduled',
          run_id: 'run-blocked-carried',
        }
      );

      expect(result.status).toBe('blocked');
      expect(result.index_patterns).toEqual([]);
    });

    it('says nothing in the default data view is visible to this hunt', async () => {
      const result = await runBlocked('blocked:empty_universe');

      expect(result.message).toBe(
        "No index in the space's default data view is visible to this hunt (checked: logs-*, filebeat-*, -*elastic-cloud-logs-*)."
      );
      expect(result.next_step).toBe(
        "Ingest data into an index the space's Security Solution default data view covers, or adjust the `securitySolution:defaultIndex` setting."
      );
    });

    it('says resolution itself failed', async () => {
      const result = await runBlocked('blocked:discovery_failed');

      expect(result.message).toBe(
        'Hunt scope resolution failed, so no index was searched (checked: logs-*, filebeat-*, -*elastic-cloud-logs-*).'
      );
      expect(result.next_step).toBe(
        "Check Elasticsearch connectivity and the calling user's index privileges, then retry."
      );
    });

    it('never names a technology, and never says "in space" since index resolution is cluster-wide', async () => {
      for (const resolution of ['blocked:empty_universe', 'blocked:discovery_failed']) {
        const result = await runBlocked(resolution);
        expect(`${result.message} ${result.next_step} ${result.narrative}`).not.toMatch(
          /technolog|in space/i
        );
      }
    });

    it('returns a blocked scope with no index patterns, targets, or technologies', async () => {
      const result = await runBlocked('blocked:empty_universe', {
        spaceId: 'hunt-a',
        report_id: 'rpt-1',
        iocs: undefined,
      });

      expect(result).toEqual(
        expect.objectContaining({
          status: 'blocked',
          index_patterns: [],
          tier2_targets: [],
          tier2_skipped_reason: 'scope_blocked',
          completed_successfully: false,
        })
      );
      expect(result).not.toHaveProperty('technologies');
    });
  });

  it('skips Tier 2 with configured_never and still completes', async () => {
    const result = await huntCoordinator(
      { esClient, reportsEsClient: esClient },
      undefined,
      logger,
      {
        spaceId: 'default',
        indexPatterns: INDEX_PATTERNS,
        trigger: 'scheduled',
        run_id: 'run-8',
        tier2_when: 'never',
      }
    );
    expect(result).toEqual(
      expect.objectContaining({
        tier2_skipped_reason: 'configured_never',
        completed_successfully: true,
      })
    );
  });

  it("gates on_hits on Tier 1's confirmed-hit verdict, not merely on Tier 1 having matched documents", async () => {
    const { huntForThreat: mockT1 } = jest.requireMock('./tier1/hunt_for_threat');
    const { huntBehavior: mockT2 } = jest.requireMock('./tier2/hunt_behavior');
    mockT2.mockClear();
    mockT1.mockResolvedValueOnce({
      status: 'environment_hits_found',
      has_confirmed_hit: false,
      searched_iocs: 1,
      searched_techniques: 0,
      resolved_iocs: [],
      resolved_techniques: [],
      time_range: { from: 'now-24h', to: 'now' },
      counts: { total_hits: 3, returned_hits: 3, affected_hosts: 0, affected_users: 0 },
      hits: [],
      affected_assets: { hosts: [], users: [], services: [] },
      per_index: [{ index: 'logs-aws.cloudtrail-default', hit_count: 3, required: true }],
    });
    const mockModel = {} as import('@kbn/agent-builder-server').ScopedModel;

    const result = await huntCoordinator(
      { esClient, reportsEsClient: esClient },
      mockModel,
      logger,
      {
        spaceId: 'default',
        indexPatterns: INDEX_PATTERNS,
        trigger: 'scheduled',
        run_id: 'run-unconfirmed-matches',
        text: 'report text',
        tier2_when: 'on_hits',
      }
    );

    expect(result.tier2_skipped_reason).toBe('no_environment_hits');
    expect(mockT2).not.toHaveBeenCalled();
  });

  it('fails the run when Tier 2 throws', async () => {
    const { huntForThreat: mockT1 } = jest.requireMock('./tier1/hunt_for_threat');
    const { huntBehavior: mockT2 } = jest.requireMock('./tier2/hunt_behavior');
    mockT1.mockResolvedValueOnce({
      status: 'environment_hits_found',
      has_confirmed_hit: true,
      searched_iocs: 1,
      searched_techniques: 0,
      resolved_iocs: [],
      resolved_techniques: [],
      time_range: { from: 'now-24h', to: 'now' },
      counts: { total_hits: 1, returned_hits: 1, affected_hosts: 0, affected_users: 0 },
      hits: [],
      affected_assets: { hosts: [], users: [], services: [] },
      per_index: [],
    });
    mockT2.mockRejectedValueOnce(new Error('connector down'));
    const mockModel = {} as import('@kbn/agent-builder-server').ScopedModel;

    const result = await huntCoordinator(
      { esClient, reportsEsClient: esClient },
      mockModel,
      logger,
      {
        spaceId: 'default',
        indexPatterns: INDEX_PATTERNS,
        trigger: 'scheduled',
        run_id: 'run-9',
        text: 'report text',
      }
    );
    expect(result).toEqual(
      expect.objectContaining({
        tier2_skipped_reason: 'tier2_failed',
        completed_successfully: false,
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
      await huntCoordinator({ esClient, reportsEsClient: esClient }, undefined, logger, {
        report_id: 'rpt-1',
        spaceId: 'hunt-a',
        indexPatterns: INDEX_PATTERNS,
        trigger: 'scheduled',
        run_id: 'run-10',
      });
      expect(mockT1).toHaveBeenCalledWith(
        esClient,
        expect.objectContaining({
          iocs: [{ type: 'ip', value: '192.0.2.30' }],
          techniques: ['T1078.004'],
        })
      );
    });

    it('loads the report from the acting space through the reports client, not the hunting client', async () => {
      const { loadReportHuntContext: mockLoad } = jest.requireMock('./common/load_report_context');
      const { huntForThreat: mockT1 } = jest.requireMock('./tier1/hunt_for_threat');
      const reportsEsClient = { tag: 'internal' } as unknown as ElasticsearchClient;
      await huntCoordinator({ esClient, reportsEsClient }, undefined, logger, {
        report_id: 'rpt-1',
        spaceId: 'hunt-a',
        indexPatterns: INDEX_PATTERNS,
        trigger: 'scheduled',
        run_id: 'run-11',
      });
      expect(mockLoad).toHaveBeenCalledWith({
        esClient: reportsEsClient,
        spaceId: 'hunt-a',
        reportId: 'rpt-1',
      });
      expect(mockT1).toHaveBeenCalledWith(esClient, expect.anything());
    });

    it('lets caller-supplied IOCs win over the report', async () => {
      const { huntForThreat: mockT1 } = jest.requireMock('./tier1/hunt_for_threat');
      await huntCoordinator({ esClient, reportsEsClient: esClient }, undefined, logger, {
        report_id: 'rpt-1',
        spaceId: 'hunt-a',
        indexPatterns: INDEX_PATTERNS,
        trigger: 'manual',
        run_id: 'run-12',
        iocs: [{ type: 'domain', value: 'evil.example' }],
      });
      expect(mockT1).toHaveBeenCalledWith(
        esClient,
        expect.objectContaining({ iocs: [{ type: 'domain', value: 'evil.example' }] })
      );
    });

    it('does not read the report when no report_id is given', async () => {
      const { loadReportHuntContext: mockLoad } = jest.requireMock('./common/load_report_context');
      await huntCoordinator({ esClient, reportsEsClient: esClient }, undefined, logger, {
        spaceId: 'hunt-a',
        indexPatterns: INDEX_PATTERNS,
        trigger: 'scheduled',
        run_id: 'run-13',
      });
      expect(mockLoad).not.toHaveBeenCalled();
    });

    it('fails the run, never clean, when the report is not in the space', async () => {
      const { loadReportHuntContext: mockLoad } = jest.requireMock('./common/load_report_context');
      mockLoad.mockResolvedValueOnce(null);
      const result = await huntCoordinator(
        { esClient, reportsEsClient: esClient },
        undefined,
        logger,
        {
          report_id: 'rpt-elsewhere',
          spaceId: 'hunt-a',
          indexPatterns: INDEX_PATTERNS,
          trigger: 'scheduled',
          run_id: 'run-14',
        }
      );
      expect(result).toEqual(
        expect.objectContaining({
          tier2_skipped_reason: 'report_not_found',
          completed_successfully: false,
        })
      );
    });

    it('still fails the run when the report is not in the space although the caller supplied every input', async () => {
      const { loadReportHuntContext: mockLoad } = jest.requireMock('./common/load_report_context');
      const { huntForThreat: mockT1 } = jest.requireMock('./tier1/hunt_for_threat');
      mockLoad.mockResolvedValueOnce(null);
      const result = await huntCoordinator(
        { esClient, reportsEsClient: esClient },
        undefined,
        logger,
        {
          report_id: 'rpt-elsewhere',
          spaceId: 'hunt-b',
          indexPatterns: INDEX_PATTERNS,
          trigger: 'manual',
          run_id: 'run-15',
          iocs: [{ type: 'ip', value: '192.0.2.30' }],
          techniques: ['T1078.004'],
          text: 'caller text',
        }
      );
      expect(mockLoad).toHaveBeenCalledWith({
        esClient,
        spaceId: 'hunt-b',
        reportId: 'rpt-elsewhere',
      });
      expect(mockT1).not.toHaveBeenCalled();
      expect(result).toEqual(
        expect.objectContaining({
          index_patterns: [],
          tier2_skipped_reason: 'report_not_found',
          has_confirmed_hit: false,
          completed_successfully: false,
        })
      );
    });
  });

  it('returns has_confirmed_hit true when Tier 2 alone hits', async () => {
    const { huntForThreat: mockT1 } = jest.requireMock('./tier1/hunt_for_threat');
    const { huntBehavior: mockT2 } = jest.requireMock('./tier2/hunt_behavior');
    mockT1.mockResolvedValueOnce({
      status: 'no_environment_hits',
      has_confirmed_hit: false,
      searched_iocs: 0,
      searched_techniques: 1,
      resolved_iocs: [],
      resolved_techniques: ['T1078.004'],
      time_range: { from: 'now-30d', to: 'now' },
      counts: { total_hits: 0, returned_hits: 0, affected_hosts: 0, affected_users: 0 },
      hits: [],
      affected_assets: { hosts: [], users: [], services: [] },
      per_index: [],
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
      has_hit: true,
      next_step: 'hit',
    });
    const mockModel = {} as import('@kbn/agent-builder-server').ScopedModel;

    const result = await huntCoordinator(
      { esClient, reportsEsClient: esClient },
      mockModel,
      logger,
      {
        spaceId: 'default',
        indexPatterns: INDEX_PATTERNS,
        trigger: 'scheduled',
        run_id: 'run-t2-only-hit',
        text: 'report text',
      }
    );

    expect(result.has_confirmed_hit).toBe(true);
  });

  describe('merging caller inputs with the report', () => {
    const { loadReportHuntContext: mockLoadReport } = jest.requireMock(
      './common/load_report_context'
    );

    beforeEach(() => {
      mockLoadReport.mockResolvedValue({
        iocs: [{ type: 'ip', value: '203.0.113.7' }],
        techniques: ['T1078.004'],
        text: 'report body',
      });
    });

    it('falls back to the report when an array is omitted', async () => {
      const { huntForThreat: mockT1 } = jest.requireMock('./tier1/hunt_for_threat');

      await huntCoordinator({ esClient, reportsEsClient: esClient }, undefined, logger, {
        spaceId: 'default',
        indexPatterns: INDEX_PATTERNS,
        trigger: 'scheduled',
        run_id: 'run-omitted',
        report_id: 'rpt-1',
      });

      expect(mockT1).toHaveBeenCalledWith(
        esClient,
        expect.objectContaining({
          iocs: [{ type: 'ip', value: '203.0.113.7' }],
          techniques: ['T1078.004'],
        })
      );
    });

    it.each([
      ['iocs', { iocs: [] }, { iocs: [], techniques: ['T1078.004'] }],
      [
        'techniques',
        { techniques: [] },
        { iocs: [{ type: 'ip', value: '203.0.113.7' }], techniques: [] },
      ],
    ])(
      'lets an explicitly empty %s override the report rather than silently restoring it',
      async (_label, override, expected) => {
        const { huntForThreat: mockT1 } = jest.requireMock('./tier1/hunt_for_threat');

        await huntCoordinator({ esClient, reportsEsClient: esClient }, undefined, logger, {
          spaceId: 'default',
          indexPatterns: INDEX_PATTERNS,
          trigger: 'manual',
          run_id: 'run-empty',
          report_id: 'rpt-1',
          ...override,
        });

        expect(mockT1).toHaveBeenCalledWith(esClient, expect.objectContaining(expected));
      }
    );
  });

  it('surfaces a budget-truncated Tier 2 without failing the run', async () => {
    const { huntBehavior: mockT2 } = jest.requireMock('./tier2/hunt_behavior');
    mockT2.mockResolvedValueOnce({
      status: 'behaviors_proposed',
      behaviors: [{ technique_id: 'T1078.004' }],
      indexed_behaviors: [],
      has_hit: false,
      incomplete: [
        {
          reason: 'generation_budget',
          technique_id: 'T1059',
          detail: 'budget reached before T1059',
        },
        {
          reason: 'generation_budget',
          technique_id: 'T1105',
          detail: 'budget reached before T1105',
        },
      ],
      next_step: 'partial',
    });
    const mockModel = {} as import('@kbn/agent-builder-server').ScopedModel;

    const result = await huntCoordinator(
      { esClient, reportsEsClient: esClient },
      mockModel,
      logger,
      {
        spaceId: 'default',
        indexPatterns: INDEX_PATTERNS,
        trigger: 'scheduled',
        run_id: 'run-partial',
        text: 'report text',
      }
    );

    expect(result.tier2?.incomplete).toHaveLength(2);
    expect(result.next_step).toContain('budget reached before T1059');
    expect(result.message).toContain('2 coverage gap(s)');
    // A deterministic budget cut must not re-open the report: the next sweep would
    // truncate it identically and re-spend the whole budget on the same techniques.
    expect(result.completed_successfully).toBe(true);
    // But it is not a clean environment either, which is the distinction the flag
    // above cannot carry on its own.
    expect(result.completeness).toBe('incomplete_final');
  });

  it('forwards the Tier 1 window into huntBehavior for execute', async () => {
    const { huntForThreat: mockT1 } = jest.requireMock('./tier1/hunt_for_threat');
    const { huntBehavior: mockT2 } = jest.requireMock('./tier2/hunt_behavior');
    mockT2.mockClear();
    mockT1.mockResolvedValueOnce({
      status: 'no_environment_hits',
      has_confirmed_hit: false,
      searched_iocs: 0,
      searched_techniques: 0,
      resolved_iocs: [],
      resolved_techniques: [],
      time_range: { from: 'now-7d', to: 'now' },
      counts: { total_hits: 0, returned_hits: 0, affected_hosts: 0, affected_users: 0 },
      hits: [],
      affected_assets: { hosts: [], users: [], services: [] },
      per_index: [],
    });
    const mockModel = {} as import('@kbn/agent-builder-server').ScopedModel;
    const search = jest.fn().mockResolvedValue({
      hits: {
        hits: [
          {
            _index: 'logs-aws.cloudtrail-default',
            _id: 'evt-1',
            _source: {
              event: {
                action: 'AssumeRole',
                provider: 'sts.amazonaws.com',
                dataset: 'aws.cloudtrail',
              },
              host: { name: 'WIN-ANALYST01' },
              user: { name: 'dev-user' },
            },
          },
        ],
      },
    });
    const esWithSearch = { search } as unknown as ElasticsearchClient;

    await huntCoordinator(
      { esClient: esWithSearch, reportsEsClient: esClient },
      mockModel,
      logger,
      {
        spaceId: 'default',
        indexPatterns: INDEX_PATTERNS,
        trigger: 'scheduled',
        run_id: 'run-window-forward',
        text: 'report text',
        size: 40,
      }
    );

    expect(search).toHaveBeenCalled();
    // These documents only ever become one-line digests, so a full `_source` would
    // move whole log events across the wire to be thrown away.
    expect(search.mock.calls[0][0]._source).toEqual([...SUMMARIZE_HIT_SOURCE_FIELDS]);
    expect(mockT2).toHaveBeenCalledWith(
      mockModel,
      logger,
      expect.objectContaining({
        window: { from: 'now-7d', to: 'now' },
        size: 40,
        row_limit: 100,
        allowed_indices: ['logs-aws.cloudtrail-*'],
        article_context: expect.objectContaining({
          matched_indices: ['logs-aws.cloudtrail-*'],
          sample_events: [expect.stringContaining('provider=sts.amazonaws.com')],
          time_range: { from: 'now-7d', to: 'now' },
        }),
      }),
      esWithSearch
    );
  });

  it('forwards Tier 1 sample_event_summaries into Tier 2 article_context', async () => {
    const { huntForThreat: mockT1 } = jest.requireMock('./tier1/hunt_for_threat');
    const { huntBehavior: mockT2 } = jest.requireMock('./tier2/hunt_behavior');
    mockT2.mockClear();
    mockT1.mockResolvedValueOnce({
      status: 'environment_hits_found',
      has_confirmed_hit: true,
      searched_iocs: 1,
      searched_techniques: 0,
      resolved_iocs: [{ type: 'ip', value: '192.0.2.30' }],
      resolved_techniques: [],
      time_range: { from: 'now-7d', to: 'now' },
      counts: { total_hits: 1, returned_hits: 1, affected_hosts: 1, affected_users: 1 },
      hits: [
        {
          index: '.ds-logs-aws.cloudtrail-default-2026.09.01-000001',
          id: 'evt-1',
          timestamp: '2026-09-01T00:00:00.000Z',
          matched: {
            ioc: { type: 'ip', value: '192.0.2.30' },
            field: 'source.ip',
          },
        },
      ],
      sample_event_summaries: [
        'dataset=aws.cloudtrail action=AssumeRole provider=sts.amazonaws.com host=WIN-ANALYST01 user=dev-user src=192.0.2.30',
      ],
      affected_assets: {
        hosts: [{ name: 'WIN-ANALYST01', hit_count: 1 }],
        users: [{ name: 'dev-user', hit_count: 1 }],
        services: [],
      },
      per_index: [
        {
          index: '.ds-logs-aws.cloudtrail-default-2026.09.01-000001',
          hit_count: 1,
          required: true,
        },
      ],
    });
    const mockModel = {} as import('@kbn/agent-builder-server').ScopedModel;

    await huntCoordinator({ esClient, reportsEsClient: esClient }, mockModel, logger, {
      spaceId: 'default',
      indexPatterns: INDEX_PATTERNS,
      trigger: 'scheduled',
      run_id: 'run-nested-hits',
      text: 'report text',
    });

    expect(mockT2).toHaveBeenCalledWith(
      mockModel,
      logger,
      expect.objectContaining({
        article_context: expect.objectContaining({
          sample_events: [
            'dataset=aws.cloudtrail action=AssumeRole provider=sts.amazonaws.com host=WIN-ANALYST01 user=dev-user src=192.0.2.30',
          ],
        }),
      }),
      esClient
    );
  });

  describe('stage 2: what Tier 2 may read', () => {
    const { resolveHuntScope: mockScope } = jest.requireMock('./common/resolve_index_scope');
    const { huntForThreat: mockT1 } = jest.requireMock('./tier1/hunt_for_threat');
    const { huntBehavior: mockT2 } = jest.requireMock('./tier2/hunt_behavior');
    const { matchDatasetsWithModel: mockModelMatch } = jest.requireMock(
      './common/match_hunt_datasets'
    );
    const mockModel = {} as import('@kbn/agent-builder-server').ScopedModel;

    const oktaDataset = {
      index_pattern: 'logs-okta.system-*',
      dataset: 'okta.system',
      vendor: 'okta',
      data_streams: ['logs-okta.system-default'],
      search_patterns: ['logs-okta.system-*'],
    };

    const tier1Clean = () => ({
      status: 'no_environment_hits',
      has_confirmed_hit: false,
      searched_iocs: 1,
      searched_techniques: 0,
      resolved_iocs: [{ type: 'ip', value: '192.0.2.30' }],
      resolved_techniques: [],
      time_range: { from: 'now-24h', to: 'now' },
      counts: { total_hits: 0, returned_hits: 0, affected_hosts: 0, affected_users: 0 },
      hits: [],
      affected_assets: { hosts: [], users: [], services: [] },
      per_index: [],
    });

    const tier1HitIn = (...indices: string[]) => ({
      ...tier1Clean(),
      status: 'environment_hits_found',
      has_confirmed_hit: true,
      counts: { total_hits: 2, returned_hits: 2, affected_hosts: 0, affected_users: 0 },
      per_index: indices.map((index) => ({ index, hit_count: 2, required: true })),
    });

    const run = (runId: string, tier2When: 'on_hits' | 'always' | 'never' = 'always') =>
      huntCoordinator({ esClient, reportsEsClient: esClient }, mockModel, logger, {
        spaceId: 'default',
        indexPatterns: INDEX_PATTERNS,
        trigger: 'scheduled',
        run_id: runId,
        iocs: [{ type: 'ip', value: '192.0.2.30' }],
        text: 'report text',
        tier2_when: tier2When,
      });

    beforeEach(() => {
      mockT2.mockClear();
      mockModelMatch.mockClear();
      mockModelMatch.mockResolvedValue(undefined);
    });

    it('unions the report match, the indices Tier 1 hit, and the actionable indices, and records each source', async () => {
      mockScope.mockResolvedValueOnce({
        ...okScope,
        report_matches: ['logs-okta.system-*'],
        actionable_indices: ['logs-endpoint.events.process-default*'],
      });
      mockT1.mockResolvedValueOnce(tier1HitIn('.ds-logs-okta.system-default-2026.09.01-000001'));

      const result = await run('run-stage2-union', 'on_hits');

      expect(result.status).toBe('tier1_and_tier2');
      expect(result.tier2_targets).toEqual([
        'logs-okta.system-*',
        'logs-okta.system-default*',
        'logs-endpoint.events.process-default*',
      ]);
      expect(result.tier2_target_sources).toEqual(['report_match', 'tier1_hits', 'actionable']);
      expect(mockT2).toHaveBeenCalledWith(
        mockModel,
        logger,
        expect.objectContaining({
          allowed_indices: result.tier2_targets,
          article_context: expect.objectContaining({
            matched_indices: ['.ds-logs-okta.system-default-2026.09.01-000001'],
          }),
        }),
        esClient
      );
    });

    it('carries a Tier 1 hit in a beats index into the targets with a wildcard suffix', async () => {
      mockScope.mockResolvedValueOnce({ ...okScope, report_matches: [] });
      mockT1.mockResolvedValueOnce(tier1HitIn('winlogbeat-8.15.0-2026.09.30'));

      const result = await run('run-stage2-beats', 'on_hits');

      expect(result.tier2_targets).toEqual(['winlogbeat-8.15.0-2026.09.30*']);
      expect(result.tier2_target_sources).toEqual(['tier1_hits']);
    });

    it('keeps a hit in host telemetry from hiding the dataset the report itself matched', async () => {
      mockScope.mockResolvedValueOnce({
        ...okScope,
        report_matches: ['logs-okta.system-*'],
      });
      mockT1.mockResolvedValueOnce(tier1HitIn('.ds-logs-endpoint.events.process-default-000001'));

      const result = await run('run-stage2-host-hit', 'on_hits');

      expect(result.tier2_targets).toEqual([
        'logs-okta.system-*',
        'logs-endpoint.events.process-default*',
      ]);
    });

    it('does not call the model when the report matched a dataset', async () => {
      mockT1.mockResolvedValueOnce(tier1Clean());

      await run('run-stage2-no-model-report');

      expect(mockModelMatch).not.toHaveBeenCalled();
    });

    it('does not call the model when Tier 1 hit', async () => {
      mockScope.mockResolvedValueOnce({
        ...okScope,
        report_matches: [],
        discovered: [oktaDataset],
      });
      mockT1.mockResolvedValueOnce(tier1HitIn('logs-okta.system-default'));

      await run('run-stage2-no-model-hit');

      expect(mockModelMatch).not.toHaveBeenCalled();
    });

    it('falls back to the model when the report matched nothing and Tier 1 hit nothing', async () => {
      mockScope.mockResolvedValueOnce({
        ...okScope,
        report_matches: [],
        actionable_indices: ['logs-endpoint.events.process-default*'],
        discovered: [oktaDataset],
      });
      mockT1.mockResolvedValueOnce(tier1Clean());
      mockModelMatch.mockResolvedValueOnce({
        matches: [oktaDataset],
        confidence: 0.9,
        scored: [{ dataset: 'okta.system', confidence: 0.9 }],
      });

      const result = await run('run-stage2-model');

      expect(mockModelMatch).toHaveBeenCalledWith(
        expect.objectContaining({
          model: mockModel,
          datasets: [oktaDataset],
          report: expect.objectContaining({ text: 'report text' }),
        })
      );
      expect(result.tier2_targets).toEqual([
        'logs-okta.system-*',
        'logs-endpoint.events.process-default*',
      ]);
      expect(result.tier2_target_sources).toEqual(['model', 'actionable']);
    });

    it('never calls the model for a run Tier 2 will not reach', async () => {
      mockScope.mockResolvedValueOnce({
        ...okScope,
        report_matches: [],
        discovered: [oktaDataset],
      });
      mockT1.mockResolvedValueOnce(tier1Clean());

      const result = await run('run-stage2-never', 'never');

      expect(mockModelMatch).not.toHaveBeenCalled();
      expect(result.tier2_skipped_reason).toBe('configured_never');
    });

    it('skips Tier 2 with no_tier2_targets when every signal is empty, even under always', async () => {
      mockScope.mockResolvedValueOnce({ ...okScope, report_matches: [] });
      mockT1.mockResolvedValueOnce(tier1Clean());

      const result = await run('run-stage2-empty', 'always');

      expect(mockT2).not.toHaveBeenCalled();
      expect(result.status).toBe('tier1_only');
      expect(result.tier2_skipped_reason).toBe('no_tier2_targets');
      expect(result.tier2_targets).toEqual([]);
      expect(result.tier2_target_sources).toEqual([]);
      expect(result.next_step).toContain('Tier 2 had no safe target');
      // Tier 1 searched the whole universe and found nothing, with no gaps of its own; the
      // absence of a target is deterministic, so it is not lost coverage.
      expect(result.completeness).toBe('complete');
      expect(result.completed_successfully).toBe(true);
    });

    it('lets always run Tier 2 against a matched dataset even when Tier 1 hit nothing', async () => {
      mockT1.mockResolvedValueOnce(tier1Clean());

      const result = await run('run-stage2-always');

      expect(result.status).toBe('tier1_and_tier2');
      expect(mockT2).toHaveBeenCalledWith(
        mockModel,
        logger,
        expect.objectContaining({ allowed_indices: ['logs-aws.cloudtrail-*'] }),
        esClient
      );
    });

    it('skips a run whose Tier 1 hit nothing under on_hits before any target is chosen', async () => {
      mockT1.mockResolvedValueOnce(tier1Clean());

      const result = await run('run-stage2-on-hits-clean', 'on_hits');

      expect(mockT2).not.toHaveBeenCalled();
      expect(result.tier2_skipped_reason).toBe('no_environment_hits');
      // The deterministic targets still describe the run.
      expect(result.tier2_targets).toEqual(['logs-aws.cloudtrail-*']);
    });
  });

  it('returns no index patterns when scope resolution throws', async () => {
    const { resolveHuntScope: mockScope } = jest.requireMock('./common/resolve_index_scope');
    mockScope.mockRejectedValueOnce(new Error('resolve failed'));

    const result = await huntCoordinator(
      { esClient, reportsEsClient: esClient },
      undefined,
      logger,
      {
        spaceId: 'default',
        indexPatterns: INDEX_PATTERNS,
        trigger: 'scheduled',
        run_id: 'run-scope-threw',
      }
    );

    expect(result).toEqual(
      expect.objectContaining({
        status: 'tier1_only',
        index_patterns: [],
        tier2_targets: [],
        tier2_target_sources: [],
        actionable_indices: [],
        completed_successfully: false,
      })
    );
  });

  it('never writes feedback — completed_successfully is the caller signal', async () => {
    const result = await huntCoordinator(
      { esClient, reportsEsClient: esClient },
      undefined,
      logger,
      {
        spaceId: 'default',
        indexPatterns: INDEX_PATTERNS,
        trigger: 'scheduled',
        run_id: 'run-4',
      }
    );
    expect(result).toHaveProperty('completed_successfully');
  });
  describe('completeness', () => {
    const { huntForThreat: mockT1 } = jest.requireMock('./tier1/hunt_for_threat');
    const { huntBehavior: mockT2 } = jest.requireMock('./tier2/hunt_behavior');
    const mockModel = {} as import('@kbn/agent-builder-server').ScopedModel;

    const tier1Result = (overrides: Record<string, unknown> = {}) => ({
      status: 'no_environment_hits',
      has_confirmed_hit: false,
      searched_iocs: 1,
      searched_techniques: 1,
      resolved_iocs: [{ type: 'ip', value: '192.0.2.30' }],
      resolved_techniques: ['T1078.004'],
      time_range: { from: 'now-24h', to: 'now' },
      counts: { total_hits: 0, returned_hits: 0, affected_hosts: 0, affected_users: 0 },
      hits: [],
      affected_assets: { hosts: [], users: [], services: [] },
      per_index: [],
      ...overrides,
    });

    const tier2Result = (overrides: Record<string, unknown> = {}) => ({
      status: 'behaviors_proposed',
      behaviors: [],
      indexed_behaviors: [],
      has_hit: false,
      next_step: 'none',
      ...overrides,
    });

    const run = (runId: string) =>
      huntCoordinator({ esClient, reportsEsClient: esClient }, mockModel, logger, {
        spaceId: 'default',
        indexPatterns: INDEX_PATTERNS,
        trigger: 'scheduled',
        run_id: runId,
        text: 'report text',
      });

    it('reports a run where both tiers searched and found nothing as complete', async () => {
      mockT1.mockResolvedValueOnce(tier1Result());
      mockT2.mockResolvedValueOnce(tier2Result());

      const result = await run('run-complete');

      expect(result.completeness).toBe('complete');
      expect(result.completed_successfully).toBe(true);
    });

    it('carries a transient Tier 1 gap through as incomplete_retryable, so the report is swept again', async () => {
      mockT1.mockResolvedValueOnce(
        tier1Result({
          incomplete: [{ reason: 'search_partial', detail: 'shards failed' }],
        })
      );
      mockT2.mockResolvedValueOnce(tier2Result());

      const result = await run('run-t1-partial');

      expect(result.completeness).toBe('incomplete_retryable');
      expect(result.completed_successfully).toBe(false);
    });

    it('carries a deterministic Tier 2 gap through as incomplete_final, so the report is not re-swept forever', async () => {
      mockT1.mockResolvedValueOnce(tier1Result());
      mockT2.mockResolvedValueOnce(
        tier2Result({
          incomplete: [
            {
              reason: 'unknown_technique_id',
              technique_id: 'T9999',
              detail: 'not in the ATT&CK catalog',
            },
          ],
        })
      );

      const result = await run('run-t2-final');

      expect(result.completeness).toBe('incomplete_final');
      // Retrying reproduces the same gap, so the run counts as done — but not as clean.
      expect(result.completed_successfully).toBe(true);
    });

    it('retires a report whose Tier 2 queries were ungrounded when Tier 1 had nothing to search', async () => {
      // A KEV-shaped report: no IOCs or techniques for Tier 1, prose with no literal values
      // for Tier 2 to ground a query in. The same text fails grounding identically every
      // sweep, so leaving it retryable re-spends a Tier 2 call per sweep and never retires.
      mockT1.mockResolvedValueOnce(
        tier1Result({
          status: 'no_searchable_terms',
          searched_iocs: 0,
          searched_techniques: 0,
          resolved_iocs: [],
          resolved_techniques: [],
        })
      );
      mockT2.mockResolvedValueOnce(
        tier2Result({
          incomplete: [
            { reason: 'query_ungrounded', technique_id: 'T1190', detail: 'no literal matched' },
          ],
        })
      );

      const result = await run('run-kev-ungrounded');

      expect(result.tier2_skipped_reason).toBeUndefined();
      expect(result.completeness).toBe('incomplete_final');
      expect(result.completed_successfully).toBe(true);
    });

    it('keeps an ungrounded query retryable when another behavior on the same text did ground and run', async () => {
      // One executed behavior proves the text holds literals a query can anchor to, so the
      // model may well ground the failed one next time.
      mockT1.mockResolvedValueOnce(
        tier1Result({
          status: 'no_searchable_terms',
          searched_iocs: 0,
          searched_techniques: 0,
          resolved_iocs: [],
          resolved_techniques: [],
        })
      );
      mockT2.mockResolvedValueOnce(
        tier2Result({
          behaviors: [
            {
              technique_id: 'T1078',
              technique_name: 'Valid Accounts',
              title: 'grounded',
              esql: 'FROM logs-* | LIMIT 1',
              evidence_quote: 'q',
              confidence: 0.6,
              severity: 'medium',
              execution: { executed: true, row_count: 0, hit: false },
            },
          ],
          incomplete: [
            { reason: 'query_ungrounded', technique_id: 'T1190', detail: 'no literal matched' },
          ],
        })
      );

      const result = await run('run-partially-grounded');

      expect(result.completeness).toBe('incomplete_retryable');
      expect(result.completed_successfully).toBe(false);
    });

    it('keeps an ungrounded Tier 2 query retryable when Tier 1 did have terms to search', async () => {
      mockT1.mockResolvedValueOnce(tier1Result());
      mockT2.mockResolvedValueOnce(
        tier2Result({
          incomplete: [
            { reason: 'query_ungrounded', technique_id: 'T1190', detail: 'no literal matched' },
          ],
        })
      );

      const result = await run('run-ungrounded-with-terms');

      expect(result.completeness).toBe('incomplete_retryable');
      expect(result.completed_successfully).toBe(false);
    });

    it('lets one transient gap keep the report eligible even alongside a deterministic one', async () => {
      mockT1.mockResolvedValueOnce(
        tier1Result({ incomplete: [{ reason: 'index_unavailable', detail: 'no shards' }] })
      );
      mockT2.mockResolvedValueOnce(
        tier2Result({
          incomplete: [{ reason: 'generation_budget', technique_id: 'T1566', detail: 'cut' }],
        })
      );

      const result = await run('run-mixed');

      expect(result.completeness).toBe('incomplete_retryable');
      expect(result.completed_successfully).toBe(false);
    });

    it('reports nothing_searched when Tier 1 mapped no term and Tier 2 was configured off', async () => {
      mockT1.mockResolvedValueOnce(tier1Result({ status: 'no_searchable_terms' }));

      const result = await huntCoordinator(
        { esClient, reportsEsClient: esClient },
        mockModel,
        logger,
        {
          spaceId: 'default',
          indexPatterns: INDEX_PATTERNS,
          trigger: 'scheduled',
          run_id: 'run-nothing-searched',
          text: 'report text',
          tier2_when: 'never',
        }
      );

      // Zero hits from zero queries must not read as a clean environment.
      expect(result.completeness).toBe('incomplete_final');
      expect(result.completed_successfully).toBe(true);
    });

    it('treats a missing connector as transient when Tier 1 also searched nothing', async () => {
      mockT1.mockResolvedValueOnce(tier1Result({ status: 'no_searchable_terms' }));

      const result = await huntCoordinator(
        { esClient, reportsEsClient: esClient },
        undefined,
        logger,
        {
          spaceId: 'default',
          indexPatterns: INDEX_PATTERNS,
          trigger: 'scheduled',
          run_id: 'run-no-inference',
          text: 'report text',
        }
      );

      // A connector can be configured, and the next run then covers the report.
      expect(result.tier2_skipped_reason).toBe('no_inference');
      expect(result.completeness).toBe('incomplete_retryable');
      expect(result.completed_successfully).toBe(false);
    });

    it('leaves a Tier 1 hit with no mapped terms alone — the tiers did search', async () => {
      mockT1.mockResolvedValueOnce(tier1Result({ status: 'environment_hits_found' }));
      mockT2.mockResolvedValueOnce(tier2Result());

      const result = await run('run-t1-hits');

      expect(result.completeness).toBe('complete');
    });

    it('reports a requested Tier 2 that could not run, even though Tier 1 searched', async () => {
      // The hole Libra found in the first version of this: keying the gap on Tier 1
      // having mapped nothing meant a report whose IOCs *were* searched, on a run with
      // no connector, reported `complete` and was retired before its behavioral
      // techniques were ever looked at.
      mockT1.mockResolvedValueOnce(tier1Result({ status: 'no_environment_hits' }));

      const result = await huntCoordinator(
        { esClient, reportsEsClient: esClient },
        undefined,
        logger,
        {
          spaceId: 'default',
          indexPatterns: INDEX_PATTERNS,
          trigger: 'scheduled',
          run_id: 'run-requested-unavailable',
          text: 'report text',
        }
      );

      expect(result.completeness).toBe('incomplete_retryable');
      expect(result.completed_successfully).toBe(false);
    });

    it.each([
      ['never', 'configured_never'],
      ['on_hits', 'no_environment_hits'],
    ] as const)(
      'treats Tier 2 not being asked for (%s) as a complete run, not lost coverage',
      async (tier2When, expectedReason) => {
        // The other half of the same decision: reporting the caller's own gating as a
        // gap would make every deliberate Tier-1-only run look incomplete.
        mockT1.mockResolvedValueOnce(tier1Result({ status: 'no_environment_hits' }));

        const result = await huntCoordinator(
          { esClient, reportsEsClient: esClient },
          mockModel,
          logger,
          {
            spaceId: 'default',
            indexPatterns: INDEX_PATTERNS,
            trigger: 'scheduled',
            run_id: `run-not-asked-${tier2When}`,
            text: 'report text',
            tier2_when: tier2When,
          }
        );

        expect(result.tier2_skipped_reason).toBe(expectedReason);
        expect(result.completeness).toBe('complete');
        expect(result.completed_successfully).toBe(true);
      }
    );

    it('reports nothing_searched when Tier 2 ran but extracted nothing and Tier 1 mapped nothing', async () => {
      // Tier 2 running is not Tier 2 searching. Extraction returning no candidate means
      // no query reached Elasticsearch, and zero hits from zero queries is not clean.
      mockT1.mockResolvedValueOnce(tier1Result({ status: 'no_searchable_terms' }));
      mockT2.mockResolvedValueOnce(tier2Result({ status: 'no_behaviors_found', behaviors: [] }));

      const result = await run('run-t2-extracted-nothing');

      expect(result.completeness).toBe('incomplete_final');
      expect(result.completed_successfully).toBe(true);
    });

    it('reports nothing_searched when behaviors were proposed but none executed', async () => {
      mockT1.mockResolvedValueOnce(tier1Result({ status: 'no_searchable_terms' }));
      mockT2.mockResolvedValueOnce(
        tier2Result({
          behaviors: [
            { technique_id: 'T1078.004', execution: { executed: false, row_count: 0, hit: false } },
          ],
        })
      );

      const result = await run('run-t2-proposed-not-executed');

      expect(result.completeness).toBe('incomplete_final');
    });

    it('stays complete when Tier 2 executed something, even though Tier 1 mapped nothing', async () => {
      // Tier 1 mapping no IOC is not itself a gap — decision #4 maps it to clean — so
      // long as something did query the environment.
      mockT1.mockResolvedValueOnce(tier1Result({ status: 'no_searchable_terms' }));
      mockT2.mockResolvedValueOnce(
        tier2Result({
          behaviors: [
            { technique_id: 'T1078.004', execution: { executed: true, row_count: 3, hit: true } },
          ],
        })
      );

      const result = await run('run-t2-did-search');

      expect(result.completeness).toBe('complete');
    });

    it('reports a report that was hunted only as a prefix, and says what it missed', async () => {
      const { loadReportHuntContext: mockLoad } = jest.requireMock('./common/load_report_context');
      mockLoad.mockResolvedValueOnce({
        iocs: [{ type: 'ip', value: '192.0.2.30' }],
        techniques: ['T1078.004'],
        text: 'report body text',
        truncated: { iocs: { kept: 100, dropped: 50 } },
      });
      mockT1.mockResolvedValueOnce(tier1Result());
      mockT2.mockResolvedValueOnce(tier2Result());

      const result = await huntCoordinator(
        { esClient, reportsEsClient: esClient },
        mockModel,
        logger,
        {
          spaceId: 'default',
          indexPatterns: INDEX_PATTERNS,
          trigger: 'scheduled',
          run_id: 'run-truncated',
          report_id: 'rpt-1',
        }
      );

      // Deterministic: the same report truncates the same way every sweep, so re-hunting
      // the same prefix gains nothing. It retires, but not as clean.
      expect(result.completeness).toBe('incomplete_final');
      expect(result.next_step).toContain('50 IOC(s)');
    });

    it('says an IOC value was too long to search for, not that it was beyond a count', async () => {
      // Two different limits lose coverage; the detail has to name the one that applied, or
      // it reads as though the report simply carried more IOCs than a hunt takes.
      const { loadReportHuntContext: mockLoad } = jest.requireMock('./common/load_report_context');
      mockLoad.mockResolvedValueOnce({
        iocs: [{ type: 'ip', value: '192.0.2.30' }],
        techniques: ['T1078.004'],
        text: 'report body text',
        truncated: { iocs: { kept: 1, dropped: 0, oversized: 1 } },
      });
      mockT1.mockResolvedValueOnce(tier1Result());
      mockT2.mockResolvedValueOnce(tier2Result());

      const result = await huntCoordinator(
        { esClient, reportsEsClient: esClient },
        mockModel,
        logger,
        {
          spaceId: 'default',
          indexPatterns: INDEX_PATTERNS,
          trigger: 'scheduled',
          run_id: 'run-oversized',
          report_id: 'rpt-1',
        }
      );

      expect(result.completeness).toBe('incomplete_final');
      expect(result.next_step).toContain('1 IOC value(s) too long');
      expect(result.next_step).not.toContain('beyond the first');
    });

    it('ignores what the report lost when the caller supplied its own IOCs', async () => {
      // The caller's array replaces the report's, so what the loader dropped from the
      // report is not coverage this run lost.
      const { loadReportHuntContext: mockLoad } = jest.requireMock('./common/load_report_context');
      mockLoad.mockResolvedValueOnce({
        iocs: [{ type: 'ip', value: '192.0.2.30' }],
        techniques: ['T1078.004'],
        text: 'report body text',
        truncated: { iocs: { kept: 100, dropped: 50 } },
      });
      mockT1.mockResolvedValueOnce(tier1Result());
      mockT2.mockResolvedValueOnce(tier2Result());

      const result = await huntCoordinator(
        { esClient, reportsEsClient: esClient },
        mockModel,
        logger,
        {
          spaceId: 'default',
          indexPatterns: INDEX_PATTERNS,
          trigger: 'scheduled',
          run_id: 'run-truncated-overridden',
          report_id: 'rpt-1',
          iocs: [{ type: 'ip', value: '203.0.113.7' }],
        }
      );

      expect(result.completeness).toBe('complete');
    });

    it('counts dropped report text against a run that read the text', async () => {
      const { loadReportHuntContext: mockLoad } = jest.requireMock('./common/load_report_context');
      mockLoad.mockResolvedValueOnce({
        iocs: [{ type: 'ip', value: '192.0.2.30' }],
        techniques: ['T1078.004'],
        text: 'report body text',
        truncated: { text: { kept: 20000, dropped: 5000 } },
      });
      mockT1.mockResolvedValueOnce(tier1Result());
      mockT2.mockResolvedValueOnce(tier2Result());

      const result = await huntCoordinator(
        { esClient, reportsEsClient: esClient },
        mockModel,
        logger,
        {
          spaceId: 'default',
          indexPatterns: INDEX_PATTERNS,
          trigger: 'scheduled',
          run_id: 'run-text-truncated',
          report_id: 'rpt-1',
        }
      );

      expect(result.completeness).toBe('incomplete_final');
      expect(result.next_step).toContain('5000 character(s) of report text');
    });

    it('does not count dropped report text against a run that never read the text', async () => {
      // Tier 2 is the only reader of the text, so on a run where it never ran the dropped
      // suffix cost this run nothing: reporting it makes a skipped Tier 2 look like a hunt
      // that fell short of its input.
      const { loadReportHuntContext: mockLoad } = jest.requireMock('./common/load_report_context');
      mockLoad.mockResolvedValueOnce({
        iocs: [{ type: 'ip', value: '192.0.2.30' }],
        techniques: ['T1078.004'],
        text: 'report body text',
        truncated: { text: { kept: 20000, dropped: 5000 } },
      });
      mockT1.mockResolvedValueOnce(tier1Result());

      const result = await huntCoordinator(
        { esClient, reportsEsClient: esClient },
        mockModel,
        logger,
        {
          spaceId: 'default',
          indexPatterns: INDEX_PATTERNS,
          trigger: 'scheduled',
          run_id: 'run-text-truncated-no-tier2',
          report_id: 'rpt-1',
          tier2_when: 'never',
        }
      );

      expect(result.tier2_skipped_reason).toBe('configured_never');
      expect(result.completeness).toBe('complete');
    });

    it('fails the run as retryable when Tier 2 throws', async () => {
      mockT1.mockResolvedValueOnce(tier1Result());
      mockT2.mockRejectedValueOnce(new Error('connector down'));

      const result = await run('run-t2-threw');

      expect(result.tier2_skipped_reason).toBe('tier2_failed');
      expect(result.completeness).toBe('incomplete_retryable');
      expect(result.completed_successfully).toBe(false);
    });
  });

  describe('when Tier 1 had nothing to search (decision 9)', () => {
    const { huntForThreat: mockT1 } = jest.requireMock('./tier1/hunt_for_threat');
    const { huntBehavior: mockT2 } = jest.requireMock('./tier2/hunt_behavior');
    const { loadReportHuntContext: mockLoad } = jest.requireMock('./common/load_report_context');
    const mockModel = {} as import('@kbn/agent-builder-server').ScopedModel;

    // A real KEV report: no IOCs, no techniques, so Tier 1 maps nothing.
    const nothingSearchable = () => ({
      status: 'no_searchable_terms',
      has_confirmed_hit: false,
      searched_iocs: 0,
      searched_techniques: 0,
      resolved_iocs: [],
      resolved_techniques: [],
      time_range: { from: 'now-24h', to: 'now' },
      counts: { total_hits: 0, returned_hits: 0, affected_hosts: 0, affected_users: 0 },
      hits: [],
      affected_assets: { hosts: [], users: [], services: [] },
      per_index: [],
    });

    beforeEach(() => {
      mockT2.mockClear();
      mockT1.mockResolvedValueOnce(nothingSearchable());
    });

    it('runs Tier 2 under on_hits when the run has report text, since Tier 1 never ran', async () => {
      const result = await huntCoordinator(
        { esClient, reportsEsClient: esClient },
        mockModel,
        logger,
        {
          spaceId: 'default',
          indexPatterns: INDEX_PATTERNS,
          trigger: 'scheduled',
          run_id: 'run-d9-text',
          text: 'CVE-2026-0001 in FortiOS SSL-VPN is exploited in the wild.',
          tier2_when: 'on_hits',
        }
      );

      expect(mockT2).toHaveBeenCalledTimes(1);
      expect(result.status).toBe('tier1_and_tier2');
      expect(result.tier2).toBeDefined();
      expect(result.tier2_skipped_reason).toBeUndefined();
    });

    it('does not gate on_hits on Tier 1 when the report names a vendor but carries no text yet', async () => {
      mockLoad.mockResolvedValueOnce({ iocs: [], techniques: [], vendor: 'Fortinet' });

      const result = await huntCoordinator(
        { esClient, reportsEsClient: esClient },
        mockModel,
        logger,
        {
          spaceId: 'default',
          indexPatterns: INDEX_PATTERNS,
          trigger: 'scheduled',
          run_id: 'run-d9-vendor',
          report_id: 'rpt-kev',
          tier2_when: 'on_hits',
        }
      );

      // Tier 2 was asked for and reached; it is the text it lacks, which a later ingest
      // can supply, so the report stays eligible rather than retiring without a query.
      expect(result.tier2_skipped_reason).not.toBe('no_searchable_input');
      expect(result.tier2_skipped_reason).toBe('no_report_text');
      expect(result.completeness).toBe('incomplete_retryable');
      expect(result.completed_successfully).toBe(false);
    });

    it('still skips with no_searchable_input under on_hits when there is nothing for Tier 2 either', async () => {
      const result = await huntCoordinator(
        { esClient, reportsEsClient: esClient },
        mockModel,
        logger,
        {
          spaceId: 'default',
          indexPatterns: INDEX_PATTERNS,
          trigger: 'scheduled',
          run_id: 'run-d9-nothing',
          tier2_when: 'on_hits',
        }
      );

      expect(mockT2).not.toHaveBeenCalled();
      expect(result.status).toBe('tier1_only');
      expect(result.tier2_skipped_reason).toBe('no_searchable_input');
      // Zero queries is not a clean environment, but it is deterministic.
      expect(result.completeness).toBe('incomplete_final');
      expect(result.completed_successfully).toBe(true);
    });

    it('lets never win even when the run has text', async () => {
      const result = await huntCoordinator(
        { esClient, reportsEsClient: esClient },
        mockModel,
        logger,
        {
          spaceId: 'default',
          indexPatterns: INDEX_PATTERNS,
          trigger: 'scheduled',
          run_id: 'run-d9-never',
          text: 'report text',
          tier2_when: 'never',
        }
      );

      expect(mockT2).not.toHaveBeenCalled();
      expect(result.tier2_skipped_reason).toBe('configured_never');
    });

    it('keeps running Tier 2 under always', async () => {
      const result = await huntCoordinator(
        { esClient, reportsEsClient: esClient },
        mockModel,
        logger,
        {
          spaceId: 'default',
          indexPatterns: INDEX_PATTERNS,
          trigger: 'scheduled',
          run_id: 'run-d9-always',
          text: 'report text',
          tier2_when: 'always',
        }
      );

      expect(mockT2).toHaveBeenCalledTimes(1);
      expect(result.status).toBe('tier1_and_tier2');
    });
  });

  describe("incomplete — the coordinator's own gaps, not a copy of the tiers'", () => {
    const mockModel = {} as import('@kbn/agent-builder-server').ScopedModel;

    it('surfaces generation_failed on a tier1Only path, where next_step is a fixed string and would otherwise hide it', async () => {
      // no_inference is in TIER2_REQUESTED_BUT_UNAVAILABLE, and next_step on this
      // path is a hardcoded string — no gap reaches the caller at all without this.
      const result = await huntCoordinator(
        { esClient, reportsEsClient: esClient },
        undefined,
        logger,
        {
          spaceId: 'default',
          indexPatterns: INDEX_PATTERNS,
          trigger: 'scheduled',
          run_id: 'run-incomplete-no-inference',
          text: 'report text',
        }
      );

      expect(result.status).toBe('tier1_only');
      expect(result.tier2_skipped_reason).toBe('no_inference');
      expect(result.incomplete).toEqual([expect.objectContaining({ reason: 'generation_failed' })]);
    });

    it('surfaces generation_failed on the tier2_only_skipped (no report text) path', async () => {
      const result = await huntCoordinator(
        { esClient, reportsEsClient: esClient },
        mockModel,
        logger,
        {
          spaceId: 'default',
          indexPatterns: INDEX_PATTERNS,
          trigger: 'scheduled',
          run_id: 'run-incomplete-no-text',
        }
      );

      expect(result.status).toBe('tier2_only_skipped');
      expect(result.tier2_skipped_reason).toBe('no_report_text');
      expect(result.incomplete).toEqual([expect.objectContaining({ reason: 'generation_failed' })]);
    });

    it('surfaces input_truncated as its own gap on the both-tiers path', async () => {
      const { huntForThreat: mockT1 } = jest.requireMock('./tier1/hunt_for_threat');
      const { huntBehavior: mockT2 } = jest.requireMock('./tier2/hunt_behavior');
      const { loadReportHuntContext: mockLoad } = jest.requireMock('./common/load_report_context');
      mockLoad.mockResolvedValueOnce({
        iocs: [{ type: 'ip', value: '192.0.2.30' }],
        techniques: ['T1078.004'],
        text: 'report body text',
        truncated: { iocs: { kept: 100, dropped: 50 } },
      });
      mockT1.mockResolvedValueOnce({
        status: 'no_environment_hits',
        has_confirmed_hit: false,
        searched_iocs: 1,
        searched_techniques: 1,
        resolved_iocs: [],
        resolved_techniques: [],
        time_range: { from: 'now-24h', to: 'now' },
        counts: { total_hits: 0, returned_hits: 0, affected_hosts: 0, affected_users: 0 },
        hits: [],
        affected_assets: { hosts: [], users: [], services: [] },
        per_index: [],
      });
      mockT2.mockResolvedValueOnce({
        status: 'behaviors_proposed',
        behaviors: [],
        indexed_behaviors: [],
        has_hit: false,
        next_step: 'none',
      });

      const result = await huntCoordinator(
        { esClient, reportsEsClient: esClient },
        mockModel,
        logger,
        {
          spaceId: 'default',
          indexPatterns: INDEX_PATTERNS,
          trigger: 'scheduled',
          run_id: 'run-incomplete-truncated',
          report_id: 'rpt-1',
        }
      );

      expect(result.incomplete).toEqual([expect.objectContaining({ reason: 'input_truncated' })]);
    });

    it('does not duplicate tier1.incomplete or tier2.incomplete onto the coordinator-level field', async () => {
      const { huntForThreat: mockT1 } = jest.requireMock('./tier1/hunt_for_threat');
      const { huntBehavior: mockT2 } = jest.requireMock('./tier2/hunt_behavior');
      mockT1.mockResolvedValueOnce({
        status: 'no_environment_hits',
        has_confirmed_hit: false,
        searched_iocs: 1,
        searched_techniques: 1,
        resolved_iocs: [],
        resolved_techniques: [],
        time_range: { from: 'now-24h', to: 'now' },
        counts: { total_hits: 0, returned_hits: 0, affected_hosts: 0, affected_users: 0 },
        hits: [],
        affected_assets: { hosts: [], users: [], services: [] },
        per_index: [],
        incomplete: [{ reason: 'search_partial', detail: 'shards failed' }],
      });
      mockT2.mockResolvedValueOnce({
        status: 'behaviors_proposed',
        behaviors: [],
        indexed_behaviors: [],
        has_hit: false,
        next_step: 'none',
        incomplete: [
          { reason: 'unknown_technique_id', technique_id: 'T9999', detail: 'not in the catalog' },
        ],
      });

      const result = await huntCoordinator(
        { esClient, reportsEsClient: esClient },
        mockModel,
        logger,
        {
          spaceId: 'default',
          indexPatterns: INDEX_PATTERNS,
          trigger: 'scheduled',
          run_id: 'run-incomplete-no-duplication',
          text: 'report text',
        }
      );

      // Both tiers reported gaps of their own, readable via tier1.incomplete /
      // tier2.incomplete — the coordinator's own field must not echo them back.
      expect(result.tier1.incomplete).toEqual([
        expect.objectContaining({ reason: 'search_partial' }),
      ]);
      expect(result.tier2?.incomplete).toEqual([
        expect.objectContaining({ reason: 'unknown_technique_id' }),
      ]);
      expect(result.incomplete).toBeUndefined();
    });

    it('is absent when the coordinator itself has nothing to report', async () => {
      const { huntForThreat: mockT1 } = jest.requireMock('./tier1/hunt_for_threat');
      const { huntBehavior: mockT2 } = jest.requireMock('./tier2/hunt_behavior');
      mockT1.mockResolvedValueOnce({
        status: 'no_environment_hits',
        has_confirmed_hit: false,
        searched_iocs: 1,
        searched_techniques: 1,
        resolved_iocs: [],
        resolved_techniques: [],
        time_range: { from: 'now-24h', to: 'now' },
        counts: { total_hits: 0, returned_hits: 0, affected_hosts: 0, affected_users: 0 },
        hits: [],
        affected_assets: { hosts: [], users: [], services: [] },
        per_index: [],
      });
      mockT2.mockResolvedValueOnce({
        status: 'behaviors_proposed',
        behaviors: [],
        indexed_behaviors: [],
        has_hit: false,
        next_step: 'none',
      });

      const result = await huntCoordinator(
        { esClient, reportsEsClient: esClient },
        mockModel,
        logger,
        {
          spaceId: 'default',
          indexPatterns: INDEX_PATTERNS,
          trigger: 'scheduled',
          run_id: 'run-incomplete-clean',
          text: 'report text',
        }
      );

      expect(result.completeness).toBe('complete');
      expect(result.incomplete).toBeUndefined();
    });
  });
});
