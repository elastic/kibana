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
      { spaceId: 'default', trigger: 'scheduled', run_id: 'run-partial', text: 'report text' }
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
            { reason: 'query_out_of_scope', technique_id: 'T1078.004', detail: 'FROM elsewhere' },
          ],
        })
      );

      const result = await run('run-t2-final');

      expect(result.completeness).toBe('incomplete_final');
      // Retrying reproduces the same gap, so the run counts as done — but not as clean.
      expect(result.completed_successfully).toBe(true);
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
          trigger: 'scheduled',
          run_id: 'run-truncated-overridden',
          report_id: 'rpt-1',
          iocs: [{ type: 'ip', value: '203.0.113.7' }],
        }
      );

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
});
