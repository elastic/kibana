/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  extractReportIdFromStepInput,
  extractReportsTotalFromLoadOutput,
  getHuntStatus,
} from './hunt_status';

describe('extractReportIdFromStepInput', () => {
  it('returns report_id from kibana.request body input', () => {
    expect(
      extractReportIdFromStepInput({
        method: 'POST',
        path: '/api/threat_intelligence/hunt_orchestrator',
        body: { report_id: 'B4R-j58BWZiJs7gLlTwa', tier2_when: 'always' },
      })
    ).toBe('B4R-j58BWZiJs7gLlTwa');
  });

  it('returns undefined when input is missing report_id', () => {
    expect(extractReportIdFromStepInput({ body: {} })).toBeUndefined();
    expect(extractReportIdFromStepInput(undefined)).toBeUndefined();
  });
});

describe('extractReportsTotalFromLoadOutput', () => {
  it('returns the candidate hits length', () => {
    expect(
      extractReportsTotalFromLoadOutput({
        hits: { total: { value: 52 }, hits: [{ _id: 'a' }, { _id: 'b' }, { _id: 'c' }] },
      })
    ).toBe(3);
  });
});

describe('getHuntStatus current report enrichment', () => {
  const esClient = { search: jest.fn(), count: jest.fn() };
  const internalClient = { search: jest.fn(), count: jest.fn() };
  const logger = { debug: jest.fn(), warn: jest.fn() };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('sets current_report_id and title from the running orchestrator step', async () => {
    internalClient.search
      .mockResolvedValueOnce({
        hits: {
          hits: [
            {
              _source: {
                id: 'run-1',
                status: 'running',
                startedAt: '2026-07-23T15:00:00.000Z',
                triggeredBy: 'manual',
              },
            },
          ],
        },
      })
      .mockResolvedValueOnce({
        hits: {
          hits: [
            {
              _source: {
                enabled: true,
                definition: { triggers: [{ type: 'scheduled', with: { every: '4h' } }] },
              },
            },
          ],
        },
      })
      .mockResolvedValueOnce({
        hits: {
          hits: [
            {
              _source: {
                stepId: 'load_hunt_candidates',
                status: 'completed',
                startedAt: '2026-07-23T15:00:01.000Z',
                output: {
                  hits: {
                    total: { value: 52 },
                    hits: Array.from({ length: 10 }, (_, i) => ({ _id: `r-${i}` })),
                  },
                },
              },
            },
            {
              _source: {
                stepId: 'run_hunt_orchestrator',
                status: 'completed',
                startedAt: '2026-07-23T15:00:05.000Z',
                stepExecutionIndex: 0,
                input: { body: { report_id: 'report-prev', tier2_when: 'always' } },
              },
            },
            {
              _source: {
                stepId: 'run_hunt_orchestrator',
                status: 'running',
                startedAt: '2026-07-23T15:00:10.000Z',
                stepExecutionIndex: 2,
                input: {
                  body: { report_id: 'report-abc', tier2_when: 'always' },
                },
              },
            },
          ],
        },
      });

    esClient.search
      .mockResolvedValueOnce({
        hits: {
          hits: [
            {
              _source: {
                content: {
                  title: 'Recurring contractor IOCs in GitHub supply-chain reporting',
                },
              },
            },
          ],
        },
      })
      .mockResolvedValueOnce({
        hits: { total: { value: 0 }, hits: [] },
        aggregations: {
          reports_with_findings: { value: 0 },
          activity: { per_hour: { buckets: [] } },
        },
      });

    const result = await getHuntStatus(
      esClient as never,
      internalClient as never,
      logger as never,
      { spaceId: 'default' }
    );

    expect(result.current_run?.current_step_id).toBe('run_hunt_orchestrator');
    expect(result.current_run?.current_report_id).toBe('report-abc');
    expect(result.current_run?.current_report_title).toBe(
      'Recurring contractor IOCs in GitHub supply-chain reporting'
    );
    expect(result.current_run?.current_report_index).toBe(3);
    expect(result.current_run?.reports_completed).toBe(1);
    expect(result.current_run?.reports_total).toBe(10);
  });
});
