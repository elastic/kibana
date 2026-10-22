/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import type { EntityAnalyticsScope } from '../../../../../common/entity_analytics/ai_brief/scope';
import type { BriefCandidate } from './types';
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

const job = (job_id: string, description = '', groups = ['security'], displayName?: string) => ({
  job_id,
  description,
  groups,
  custom_settings: displayName ? { security_app_display_name: displayName } : undefined,
});
const esClientOf = ({
  jobs = [job('high_sent_bytes')],
  search = jest.fn().mockResolvedValue({ aggregations: {} }),
}: {
  jobs?: ReturnType<typeof job>[];
  search?: jest.Mock;
} = {}) =>
  ({
    ml: { getJobs: jest.fn().mockResolvedValue({ jobs }) },
    search,
  } as unknown as ElasticsearchClient);

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
    const esClient = esClientOf({
      jobs: [
        job('ded_high_sent_bytes', 'Detects data exfiltration.'),
        job('rare_process', 'Detects rare processes.', ['security'], 'Unusual process'),
        job('legacy_job', '', ['siem']),
        job('observability_job', 'Detects slow requests.', ['apm'], 'Slow requests'),
        job('ungrouped_job', '', []),
      ],
    });

    await expect(readSecurityJobs(esClient)).resolves.toEqual({
      jobIds: ['ded_high_sent_bytes', 'rare_process', 'legacy_job'],
      nameByJobId: new Map([['rare_process', 'Unusual process']]),
    });
  });
});

describe('readAnomalies', () => {
  it('reads the final records of the period of the Security jobs, that the candidate and its members own, not by entity id', async () => {
    const search = jest.fn().mockResolvedValue({ aggregations: {} });

    await readAnomalies({
      candidates: [candidate],
      scope,
      esClient: esClientOf({ search }),
      logger,
    });

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

  it('has no anomalies, and reads no results, when no Security job is installed', async () => {
    const search = jest.fn();

    await expect(
      readAnomalies({
        candidates: [candidate],
        scope,
        esClient: esClientOf({ jobs: [], search }),
        logger,
      })
    ).resolves.toEqual({});
    expect(search).not.toHaveBeenCalled();
  });

  it.each([
    ['the jobs', { ml: { getJobs: jest.fn().mockRejectedValue(new Error('no privileges')) } }],
    ['the results', { ...esClientOf(), search: jest.fn().mockRejectedValue(new Error('no')) }],
  ])('reports a failed read of %s as no anomalies, never as an error', async (_what, esClient) => {
    await expect(
      readAnomalies({
        candidates: [candidate],
        scope,
        esClient: esClient as unknown as ElasticsearchClient,
        logger,
      })
    ).resolves.toEqual({});
  });
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
