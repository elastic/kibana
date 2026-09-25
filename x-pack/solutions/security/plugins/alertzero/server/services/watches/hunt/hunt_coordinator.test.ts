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

jest.mock('./common/resolve_index_scope', () => ({
  resolveHuntScope: jest.fn().mockResolvedValue({
    technologies: ['aws_iam'],
    status: 'ok',
    required: ['logs-aws.cloudtrail-*'],
    optional: [],
    missing: [],
    window: { from: 'now-24h', to: 'now' },
    row_limit: 100,
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

const logger = loggingSystemMock.createLogger();

const esClient = {} as ElasticsearchClient;

describe('huntCoordinator', () => {
  it('returns tier1_only with skip reason when no hits and tier2_when=on_hits', async () => {
    const result = await huntCoordinator(
      { esClient, reportsEsClient: esClient },
      undefined,
      logger,
      {
        spaceId: 'default',
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
        trigger: 'scheduled',
        run_id: 'run-2',
        text: 'some report text',
      }
    );
    expect(result.status).toBe('tier1_only');
    expect(result.tier2_skipped_reason).toBe('no_inference');
    expect(result.completed_successfully).toBe(true);
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
        trigger: 'scheduled',
        run_id: 'run-3',
        // no text
      }
    );
    expect(result.tier2_skipped_reason).toBe('no_report_text');
  });

  it('forwards an explicit technology to scope resolution', async () => {
    const { resolveHuntScope: mockScope } = jest.requireMock('./common/resolve_index_scope');
    await huntCoordinator({ esClient, reportsEsClient: esClient }, undefined, logger, {
      spaceId: 'default',
      trigger: 'scheduled',
      run_id: 'run-5',
      technology: 'fortigate',
    });
    expect(mockScope).toHaveBeenCalledWith(
      expect.objectContaining({ spaceId: 'default', technology: 'fortigate' })
    );
  });

  it('reports the technologies the scope resolved to', async () => {
    const result = await huntCoordinator(
      { esClient, reportsEsClient: esClient },
      undefined,
      logger,
      {
        spaceId: 'default',
        trigger: 'scheduled',
        run_id: 'run-6',
      }
    );
    expect(result.technologies).toEqual(['aws_iam']);
  });

  it('echoes the caller-supplied run_id', async () => {
    const result = await huntCoordinator(
      { esClient, reportsEsClient: esClient },
      undefined,
      logger,
      {
        spaceId: 'default',
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
      mockScope.mockResolvedValueOnce({
        technologies: [],
        status: 'blocked',
        required: ['logs-aws.*', 'logs-fortinet.*'],
        optional: [],
        missing: ['logs-aws.*', 'logs-fortinet.*'],
        window: { from: 'now-24h', to: 'now' },
        row_limit: 100,
      });
      result = await huntCoordinator({ esClient, reportsEsClient: esClient }, undefined, logger, {
        spaceId: 'default',
        trigger: 'scheduled',
        run_id: 'run-7',
      });
    });

    it('returns a blocked status instead of a clean one', () => {
      expect(result.status).toBe('blocked');
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

  it('skips Tier 2 with configured_never and still completes', async () => {
    const result = await huntCoordinator(
      { esClient, reportsEsClient: esClient },
      undefined,
      logger,
      {
        spaceId: 'default',
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

  it('skips Tier 2 on_hits when only optional indices matched (no confirmed hit)', async () => {
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
      per_index: [{ index: '.alerts-security.alerts-default', hit_count: 3, required: false }],
    });
    const mockModel = {} as import('@kbn/agent-builder-server').ScopedModel;

    const result = await huntCoordinator(
      { esClient, reportsEsClient: esClient },
      mockModel,
      logger,
      {
        spaceId: 'default',
        trigger: 'scheduled',
        run_id: 'run-optional-only',
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
      uncorroborated_technique_ids: ['T1059', 'T1105'],
      next_step: 'partial',
    });
    const mockModel = {} as import('@kbn/agent-builder-server').ScopedModel;

    const result = await huntCoordinator(
      { esClient, reportsEsClient: esClient },
      mockModel,
      logger,
      { spaceId: 'default', trigger: 'scheduled', run_id: 'run-partial', text: 'report text' }
    );

    expect(result.tier2?.uncorroborated_technique_ids).toEqual(['T1059', 'T1105']);
    expect(result.next_step).toContain('T1059, T1105');
    expect(result.message).toContain('2 uncorroborated');
    // A deterministic budget cut must not re-open the report: the next sweep would
    // truncate it identically and re-spend the whole budget on the same techniques.
    expect(result.completed_successfully).toBe(true);
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
        required_indices: ['logs-aws.cloudtrail-*'],
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

  describe('Tier 2 generation targets', () => {
    const tier1WithBuckets = (perIndex: Array<{ index: string; required: boolean }>) => ({
      status: 'environment_hits_found',
      has_confirmed_hit: perIndex.some((entry) => entry.required),
      searched_iocs: 1,
      searched_techniques: 0,
      resolved_iocs: [{ type: 'ip', value: '192.0.2.30' }],
      resolved_techniques: [],
      time_range: { from: 'now-7d', to: 'now' },
      counts: { total_hits: 3, returned_hits: 0, affected_hosts: 0, affected_users: 0 },
      hits: [],
      affected_assets: { hosts: [], users: [], services: [] },
      per_index: perIndex.map((entry) => ({ ...entry, hit_count: 1 })),
    });
    const mockModel = {} as import('@kbn/agent-builder-server').ScopedModel;

    beforeEach(() => {
      jest.requireMock('./tier2/hunt_behavior').huntBehavior.mockClear();
    });

    it('steers generation only at required-index buckets, never at the alerts index that also matched', async () => {
      const { huntForThreat: mockT1 } = jest.requireMock('./tier1/hunt_for_threat');
      const { huntBehavior: mockT2 } = jest.requireMock('./tier2/hunt_behavior');
      mockT1.mockResolvedValueOnce(
        tier1WithBuckets([
          { index: '.internal.alerts-security.alerts-default-000001', required: false },
          { index: '.ds-logs-aws.cloudtrail-default-2026.09.01-000001', required: true },
        ])
      );

      await huntCoordinator({ esClient, reportsEsClient: esClient }, mockModel, logger, {
        spaceId: 'default',
        trigger: 'scheduled',
        run_id: 'run-required-buckets',
        text: 'report text',
      });

      expect(mockT2).toHaveBeenCalledWith(
        mockModel,
        logger,
        expect.objectContaining({
          article_context: expect.objectContaining({
            matched_indices: ['.ds-logs-aws.cloudtrail-default-2026.09.01-000001'],
          }),
        }),
        esClient
      );
    });

    it('omits matched_indices when Tier 1 matched only optional indices, so generation falls back to the required patterns', async () => {
      const { huntForThreat: mockT1 } = jest.requireMock('./tier1/hunt_for_threat');
      const { huntBehavior: mockT2 } = jest.requireMock('./tier2/hunt_behavior');
      mockT1.mockResolvedValueOnce(
        tier1WithBuckets([
          { index: '.internal.alerts-security.alerts-default-000001', required: false },
        ])
      );

      await huntCoordinator({ esClient, reportsEsClient: esClient }, mockModel, logger, {
        spaceId: 'default',
        trigger: 'scheduled',
        run_id: 'run-optional-only-buckets',
        text: 'report text',
      });

      const [, , tier2Params] = mockT2.mock.calls[0];
      expect(tier2Params.article_context).not.toHaveProperty('matched_indices');
      expect(tier2Params.required_indices).toEqual(['logs-aws.cloudtrail-*']);
    });
  });

  it('never writes feedback — completed_successfully is the caller signal', async () => {
    const result = await huntCoordinator(
      { esClient, reportsEsClient: esClient },
      undefined,
      logger,
      {
        spaceId: 'default',
        trigger: 'scheduled',
        run_id: 'run-4',
      }
    );
    expect(result).toHaveProperty('completed_successfully');
  });
});
