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
  readSecurityJobNames,
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
  it.each([
    ['no aggregations, as when the results index is missing', undefined, {}],
    [
      'the jobs of each candidate, and no entry for a candidate without records',
      {
        byCandidate: {
          buckets: {
            'user:a': {
              doc_count: 7,
              jobs: {
                buckets: [
                  { key: 'high_bytes_written_to_external_device', highestScore: { value: 91.6 } },
                  { key: 'high_sent_bytes_destination_ip', highestScore: { value: 50 } },
                ],
              },
            },
            'host:b': { doc_count: 0, jobs: { buckets: [] } },
          },
        },
      },
      {
        'user:a': {
          count: 7,
          jobs: [
            { index: 1, name: 'Detects bytes written to a device.', score: 92 },
            { index: 2, name: 'high_sent_bytes_destination_ip', score: 50 },
          ],
        },
      },
    ],
  ])('returns %s', (_description, aggregations, expected) => {
    expect(
      toAnomaliesByCandidateId(
        aggregations,
        new Map([['high_bytes_written_to_external_device', 'Detects bytes written to a device.']])
      )
    ).toEqual(expected);
  });
});

describe('readSecurityJobNames', () => {
  it('keeps the jobs of the Security groups, named by their display name, else their description, else their id', async () => {
    const esClient = esClientOf({
      jobs: [
        job('ded_high_sent_bytes', 'Detects data exfiltration.'),
        job('rare_process', 'Detects rare processes.', ['security'], 'Unusual process'),
        job('legacy_job', '', ['siem']),
        job('observability_job', 'Detects slow requests.', ['apm']),
        job('ungrouped_job', '', []),
      ],
    });

    await expect(readSecurityJobNames(esClient)).resolves.toEqual(
      new Map([
        ['ded_high_sent_bytes', 'Detects data exfiltration'],
        ['rare_process', 'Unusual process'],
        ['legacy_job', 'legacy_job'],
      ])
    );
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
  it('takes the job with the highest record score', () => {
    const { terms, aggs } = buildJobsAggregation();

    expect(terms.size).toBe(1);
    expect(terms.order).toEqual({ highestScore: 'desc' });
    expect(aggs.highestScore.max.field).toBe('record_score');
  });
});
