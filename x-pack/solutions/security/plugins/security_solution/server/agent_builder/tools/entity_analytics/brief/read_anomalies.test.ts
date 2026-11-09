/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import type { EntityAnalyticsScope } from '../../../../../common/entity_analytics/ai_brief/scope';
import type { BriefCandidate, BriefJobService } from './types';
import {
  buildJobsAggregation,
  readAnomalies,
  readSecurityJobs,
  toAnomaliesByCandidateId,
} from './read_anomalies';

const scope: EntityAnalyticsScope = {
  period: '7d',
  capturedAt: '2026-10-14T12:00:00.000Z',
  tiles: {},
};

const candidate: BriefCandidate = {
  id: 'host:web-01',
  name: 'web-01',
  type: 'host',
  tileIds: [],
  record: { host: { name: 'web-01' } },
};

const logger = { debug: jest.fn() } as unknown as Logger;

const job = (id: string, groups = ['security'], displayName?: string) => ({
  id,
  groups,
  customSettings: displayName ? { security_app_display_name: displayName } : undefined,
});
const jobServiceOf = (jobs: ReturnType<typeof job>[] = [job('high_sent_bytes')]) =>
  ({ jobsSummary: jest.fn().mockResolvedValue(jobs) } as unknown as BriefJobService);
const esClientOf = (search = jest.fn().mockResolvedValue({ aggregations: {} })) =>
  ({ search } as unknown as ElasticsearchClient);

describe('toAnomaliesByCandidateId', () => {
  const jobs = (buckets: Array<[string, number]>) => ({
    top: { buckets: buckets.map(([key, value]) => ({ key, highestScore: { value } })) },
  });

  it.each([
    ['no aggregations, as when the results index is missing', undefined, {}],
    [
      'the named job and the number of jobs of each candidate, and no entry for a candidate without records',
      {
        byCandidate: {
          buckets: {
            'user:a': {
              doc_count: 7,
              jobCount: { value: 3 },
              jobs: jobs([['high_bytes_written', 91.6]]),
            },
            'host:b': { doc_count: 0, jobCount: { value: 0 }, jobs: jobs([]) },
          },
        },
      },
      {
        'user:a': {
          count: 7,
          jobCount: 3,
          jobs: [{ index: 1, name: 'Unusual device writes', score: 92 }],
        },
      },
    ],
    [
      'a count of jobs and no cited job when none of them is named',
      {
        byCandidate: {
          buckets: { 'user:a': { doc_count: 4, jobCount: { value: 2 }, jobs: jobs([]) } },
        },
      },
      { 'user:a': { count: 4, jobCount: 2, jobs: [] } },
    ],
  ])('returns %s', (_description, aggregations, expected) => {
    expect(
      toAnomaliesByCandidateId(
        aggregations,
        new Map([['high_bytes_written', 'Unusual device writes']])
      )
    ).toEqual(expected);
  });
});

describe('readSecurityJobs', () => {
  it('keeps the jobs of the Security groups, and names only those with a display name', async () => {
    const jobService = jobServiceOf([
      job('ded_high_sent_bytes'),
      job('rare_process', ['security'], 'Unusual process'),
      job('legacy_job', ['siem']),
      job('observability_job', ['apm'], 'Slow requests'),
      job('ungrouped_job', []),
    ]);

    await expect(readSecurityJobs(jobService)).resolves.toEqual({
      jobIds: ['ded_high_sent_bytes', 'rare_process', 'legacy_job'],
      nameByJobId: new Map([['rare_process', 'Unusual process']]),
    });
  });
});

describe('readAnomalies', () => {
  const read = (params: Partial<Parameters<typeof readAnomalies>[0]> = {}) =>
    readAnomalies({
      candidates: [candidate],
      scope,
      jobService: jobServiceOf(),
      esClient: esClientOf(),
      logger,
      ...params,
    });

  it('reads the final records of the period of the Security jobs, that the candidate and its members own, not by entity id', async () => {
    const search = jest.fn().mockResolvedValue({ aggregations: {} });

    await read({ esClient: esClientOf(search) });

    const [{ index, query, aggs }] = search.mock.calls[0];
    expect(index).toBe('.ml-anomalies-shared*');
    expect(JSON.stringify(query)).toContain('{"term":{"result_type":"record"}}');
    expect(JSON.stringify(query)).toContain('{"term":{"is_interim":false}}');
    expect(JSON.stringify(query)).toContain('{"terms":{"job_id":["high_sent_bytes"]}}');
    expect(aggs.byCandidate.aggs.jobCount).toEqual({ cardinality: { field: 'job_id' } });
    expect(JSON.stringify(query)).toContain('"@timestamp":{"gte":"2026-10-07T12:00:00.000Z"');
    expect(JSON.stringify(aggs.byCandidate.filters.filters['host:web-01'])).toContain(
      '{"term":{"host.name":"web-01"}}'
    );
    expect(JSON.stringify(aggs.byCandidate.filters.filters['host:web-01'])).not.toContain(
      'entity.id'
    );
  });

  it.each([
    ['without the ML plugin', { jobService: undefined }],
    ['when no Security job is installed', { jobService: jobServiceOf([job('other', ['apm'])]) }],
  ])('has no anomalies, reads no results and has not failed, %s', async (_when, params) => {
    const search = jest.fn();

    await expect(read({ ...params, esClient: esClientOf(search) })).resolves.toEqual({
      anomaliesByEntityId: {},
      isFailed: false,
    });
    expect(search).not.toHaveBeenCalled();
  });

  it.each([
    [
      'the jobs',
      { jobService: { jobsSummary: jest.fn().mockRejectedValue(new Error('no privileges')) } },
    ],
    ['the results', { esClient: esClientOf(jest.fn().mockRejectedValue(new Error('no'))) }],
  ])(
    'reports a failed read of %s as no anomalies and isFailed, never as an error',
    async (_what, params) => {
      await expect(read(params)).resolves.toEqual({ anomaliesByEntityId: {}, isFailed: true });
    }
  );
});

describe('buildJobsAggregation', () => {
  it('takes the named job with the highest record score', () => {
    const { filter, aggs } = buildJobsAggregation(['rare_process']);

    expect(filter).toEqual({ terms: { job_id: ['rare_process'] } });
    expect(aggs.top.terms.size).toBe(1);
    expect(aggs.top.terms.order).toEqual({ highestScore: 'desc' });
    expect(aggs.top.aggs.highestScore.max.field).toBe('record_score');
  });
});
