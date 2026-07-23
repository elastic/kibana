/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggingSystemMock } from '@kbn/core/server/mocks';
import type { ElasticsearchClient } from '@kbn/core/server';
import type { WorkflowsServerPluginSetup } from '@kbn/workflows-management-plugin/server';
import { ExecutionStatus } from '@kbn/workflows';
import {
  countSuppressedFindings,
  extractCandidateTotal,
  extractReportIdFromStepPayload,
  extractTitleFromCandidateHits,
  getContinuousHuntStatus,
  loadReportTitle,
} from './continuous_hunt_status';

describe('extractReportIdFromStepPayload', () => {
  it('returns report_id from a nested kibana.request body', () => {
    expect(
      extractReportIdFromStepPayload({
        body: { report_id: 'r-1', tier2_when: 'always' },
      })
    ).toBe('r-1');
  });

  it('returns report_id from a flat payload', () => {
    expect(extractReportIdFromStepPayload({ report_id: 'r-2' })).toBe('r-2');
  });
});

describe('extractCandidateTotal', () => {
  it('returns hits.hits length when present', () => {
    expect(
      extractCandidateTotal({
        hits: { hits: [{ _id: 'a' }, { _id: 'b' }], total: { value: 99 } },
      })
    ).toBe(2);
  });
});

describe('extractTitleFromCandidateHits', () => {
  it('returns content.title for the matching candidate hit', () => {
    expect(
      extractTitleFromCandidateHits(
        {
          hits: {
            hits: [
              { _id: 'r-a', _source: { content: { title: 'Alpha' } } },
              { _id: 'r-b', _source: { content: { title: 'Bravo campaign' } } },
            ],
          },
        },
        'r-b'
      )
    ).toBe('Bravo campaign');
  });
});

describe('loadReportTitle', () => {
  it('returns content.title from an ids search against the reports pattern', async () => {
    const search = jest.fn().mockResolvedValue({
      hits: {
        hits: [{ _id: 'r-1', _source: { content: { title: 'From ids search' } } }],
      },
    });
    const title = await loadReportTitle({ search } as unknown as ElasticsearchClient, 'r-1');
    expect(title).toBe('From ids search');
    expect(search).toHaveBeenCalledWith(
      expect.objectContaining({
        query: { ids: { values: ['r-1'] } },
        _source: ['content.title'],
      })
    );
  });
});

describe('countSuppressedFindings', () => {
  it('counts duplicates beyond the first report_id:technique_id', () => {
    expect(
      countSuppressedFindings([
        { report_id: 'r1', technique_id: 'T1001' },
        { report_id: 'r1', technique_id: 'T1001' },
        { report_id: 'r1', technique_id: 'T1002' },
        { report_id: 'r2', technique_id: 'T1001' },
      ])
    ).toEqual({ suppressedCount: 1, distinctReports: 2 });
  });
});

describe('getContinuousHuntStatus', () => {
  const logger = loggingSystemMock.createLogger();
  const now = new Date('2026-07-23T12:00:00.000Z');

  const buildEs = (hits: unknown[] = [], sparkBuckets: number[] = []): ElasticsearchClient => {
    const search = jest
      .fn()
      .mockImplementation(
        async (req: { size?: number; query?: { ids?: { values?: string[] } }; index?: string }) => {
          if (req.query?.ids?.values?.length) {
            const id = req.query.ids.values[0];
            return {
              hits: {
                hits: [
                  {
                    _id: id,
                    _source: { content: { title: 'Okta identity takeover live' } },
                  },
                ],
              },
            };
          }
          if (req.size === 0) {
            return {
              aggregations: {
                activity_24h: {
                  buckets: sparkBuckets.map((doc_count) => ({ doc_count })),
                },
              },
            };
          }
          return {
            hits: { hits },
            aggregations: {
              activity_24h: {
                buckets: sparkBuckets.map((doc_count) => ({ doc_count })),
              },
            },
          };
        }
      );
    return { search } as unknown as ElasticsearchClient;
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns idle findings-only status when workflowsManagement is missing', async () => {
    const esClient = buildEs(
      [
        {
          _source: { report_id: 'r1', technique_id: 'T1', status: 'new' },
        },
        {
          _source: { report_id: 'r1', technique_id: 'T1', status: 'new' },
        },
      ],
      [1, 2]
    );

    const result = await getContinuousHuntStatus({
      spaceId: 'default',
      esClient,
      logger,
      now,
    });

    expect(result.phase).toBe('idle');
    expect(result.workflow_enabled).toBe(false);
    expect(result.findings.new_count).toBe(2);
    expect(result.findings.suppressed_count).toBe(1);
    expect(result.report).toBeUndefined();
  });

  it('returns hunting with report progress when an active execution exists', async () => {
    const getWorkflow = jest.fn().mockResolvedValue({ enabled: true });
    const getWorkflowExecutions = jest
      .fn()
      .mockResolvedValueOnce({
        results: [
          {
            id: 'exec-1',
            status: ExecutionStatus.RUNNING,
            startedAt: '2026-07-23T11:55:00.000Z',
          },
        ],
      })
      .mockResolvedValueOnce({
        results: [
          {
            id: 'exec-0',
            status: ExecutionStatus.COMPLETED,
            finishedAt: '2026-07-23T08:00:00.000Z',
          },
        ],
      });
    const getWorkflowExecution = jest.fn().mockResolvedValue({
      id: 'exec-1',
      status: ExecutionStatus.RUNNING,
      startedAt: '2026-07-23T11:55:00.000Z',
      stepExecutions: [
        {
          stepId: 'load_hunt_candidates',
          status: ExecutionStatus.COMPLETED,
          output: {
            hits: {
              hits: [
                { _id: 'r-a', _source: { content: { title: 'Alpha' } } },
                { _id: 'r-b', _source: { content: { title: 'Okta identity takeover live' } } },
                { _id: 'r-c' },
                { _id: 'r-d' },
              ],
            },
          },
        },
        {
          stepId: 'run_hunt_orchestrator',
          status: ExecutionStatus.COMPLETED,
          input: { body: { report_id: 'r-a' } },
          output: { body: { report_id: 'r-a', status: 'tier1_and_tier2' } },
        },
        {
          stepId: 'run_hunt_orchestrator',
          status: ExecutionStatus.RUNNING,
          input: { body: { report_id: 'r-b' } },
        },
      ],
    });

    const workflowsManagement = {
      management: { getWorkflow, getWorkflowExecutions, getWorkflowExecution },
    } as unknown as WorkflowsServerPluginSetup;

    const esClient = buildEs(
      [],
      Array.from({ length: 24 }, () => 0)
    );

    const result = await getContinuousHuntStatus({
      spaceId: 'default',
      esClient,
      logger,
      workflowsManagement,
      now,
    });

    expect(result.phase).toBe('hunting');
    expect(result.workflow_enabled).toBe(true);
    expect(result.workflow_execution_id).toBe('exec-1');
    expect(result.report).toEqual({
      id: 'r-b',
      title: 'Okta identity takeover live',
      index: 2,
      total: 4,
    });
    expect(result.tier?.label).toContain('Running Tier 1 and Tier 2');
    expect(result.last_completed_at).toBe('2026-07-23T08:00:00.000Z');
  });

  it('returns idle quiet when workflow is present but no new findings', async () => {
    const getWorkflow = jest.fn().mockResolvedValue({ enabled: true });
    const getWorkflowExecutions = jest
      .fn()
      .mockResolvedValueOnce({ results: [] })
      .mockResolvedValueOnce({
        results: [
          {
            id: 'exec-0',
            status: ExecutionStatus.COMPLETED,
            finishedAt: '2026-07-23T08:00:00.000Z',
          },
        ],
      });

    const workflowsManagement = {
      management: {
        getWorkflow,
        getWorkflowExecutions,
        getWorkflowExecution: jest.fn(),
      },
    } as unknown as WorkflowsServerPluginSetup;

    const esClient = buildEs(
      [
        {
          _source: { report_id: 'r1', technique_id: 'T1', status: 'deployed' },
        },
      ],
      Array.from({ length: 24 }, () => 0)
    );

    const result = await getContinuousHuntStatus({
      spaceId: 'default',
      esClient,
      logger,
      workflowsManagement,
      now,
    });

    expect(result.phase).toBe('idle');
    expect(result.findings.new_count).toBe(0);
    expect(result.workflow_enabled).toBe(true);
  });
});
