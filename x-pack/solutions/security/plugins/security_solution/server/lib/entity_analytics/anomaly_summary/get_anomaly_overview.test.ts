/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger, SavedObjectsClientContract } from '@kbn/core/server';
import type { MlPluginSetup } from '@kbn/ml-plugin/server';
import { getEntityAnomalyOverview } from './get_anomaly_overview';
import { getJobConfig, getSecurityMlJobIds } from '../ml_anomaly_detection';

jest.mock('../ml_anomaly_detection', () => ({
  getJobConfig: jest.fn(),
  getSecurityMlJobIds: jest.fn(),
}));

const mockGetJobConfig = getJobConfig as jest.Mock;
const mockGetSecurityMlJobIds = getSecurityMlJobIds as jest.Mock;

const mockMlAnomalySearch = jest.fn();
const mockMl = {
  mlSystemProvider: jest.fn().mockReturnValue({ mlAnomalySearch: mockMlAnomalySearch }),
} as unknown as MlPluginSetup;

const mockLogger: Logger = {
  debug: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  info: jest.fn(),
  fatal: jest.fn(),
  trace: jest.fn(),
} as unknown as Logger;

const mockSoClient = {} as SavedObjectsClientContract;

const FROM_MS = 1_700_000_000_000;
const TO_MS = FROM_MS + 7 * 24 * 60 * 60 * 1000; // 7 days later

const baseParams = {
  entityId: 'entity-1',
  entityType: 'host' as const,
  fromMs: FROM_MS,
  toMs: TO_MS,
  logger: mockLogger,
  ml: mockMl,
  soClient: mockSoClient,
};

const emptyResult = {
  recentAnomalies: [],
  tacticCounts: {},
  totalAnomaliesCount: 0,
  from: FROM_MS,
  to: TO_MS,
};

interface RawHit {
  job_id: string;
  timestamp: number;
  record_score: number;
  detector_index: number;
  function?: string;
  by_field_value?: string;
  actual?: number[];
}

const makeSearchResponse = (
  hits: RawHit[] = [],
  allJobBuckets: Array<{ key: string; doc_count: number }> = [],
  total: number = 0
) => ({
  hits: {
    hits: hits.map((src) => ({ _source: src })),
    total: { value: total },
  },
  aggregations: {
    all_jobs: { buckets: allJobBuckets },
  },
});

beforeEach(() => {
  jest.clearAllMocks();
  mockMl.mlSystemProvider = jest.fn().mockReturnValue({ mlAnomalySearch: mockMlAnomalySearch });
});

describe('getEntityAnomalyOverview', () => {
  describe('when there are no security ML jobs', () => {
    it('returns empty result without calling mlAnomalySearch', async () => {
      mockGetSecurityMlJobIds.mockResolvedValue([]);

      const result = await getEntityAnomalyOverview(baseParams);

      expect(result).toEqual(emptyResult);
      expect(mockMlAnomalySearch).not.toHaveBeenCalled();
    });
  });

  describe('when the search returns no anomalies', () => {
    it('returns empty result when all_jobs buckets is empty', async () => {
      mockGetSecurityMlJobIds.mockResolvedValue(['job-1']);
      mockGetJobConfig.mockResolvedValue(new Map());
      mockMlAnomalySearch.mockResolvedValue(makeSearchResponse([], [], 0));

      const result = await getEntityAnomalyOverview(baseParams);

      expect(result).toEqual(emptyResult);
    });
  });

  describe('when mlAnomalySearch throws', () => {
    it('logs a warning and returns empty result', async () => {
      mockGetSecurityMlJobIds.mockResolvedValue(['job-1']);
      mockGetJobConfig.mockResolvedValue(new Map());
      mockMlAnomalySearch.mockRejectedValue(new Error('ES error'));

      const result = await getEntityAnomalyOverview(baseParams);

      expect(result).toEqual(emptyResult);
      expect(mockLogger.warn).toHaveBeenCalledWith(expect.stringContaining('entity-1'));
    });
  });

  describe('with anomaly data', () => {
    const JOB_A = 'job-a';
    const JOB_B = 'job-b';

    const jobConfigMap = new Map([
      [
        JOB_A,
        {
          jobName: 'Job A',
          threatTactics: ['Execution', 'Discovery'],
          threatTechniques: [],
          detectors: [{ function: 'high_count' }],
        },
      ],
      [
        JOB_B,
        {
          jobName: 'Job B',
          threatTactics: ['Persistence'],
          threatTechniques: [],
          detectors: [{ function: 'rare' }],
        },
      ],
    ]);

    const rawHit1: RawHit = {
      job_id: JOB_A,
      timestamp: FROM_MS + 1000,
      record_score: 75.5,
      detector_index: 0,
      function: 'high_count',
      actual: [13],
    };
    const rawHit2: RawHit = {
      job_id: JOB_B,
      timestamp: FROM_MS + 500,
      record_score: 50,
      detector_index: 0,
      function: 'rare',
      by_field_value: 'Crimea',
    };

    const searchResponse = makeSearchResponse(
      [rawHit1, rawHit2],
      [
        { key: JOB_A, doc_count: 4 },
        { key: JOB_B, doc_count: 1 },
      ],
      5
    );

    beforeEach(() => {
      mockGetSecurityMlJobIds.mockResolvedValue([JOB_A, JOB_B]);
      mockGetJobConfig.mockResolvedValue(jobConfigMap);
      mockMlAnomalySearch.mockResolvedValue(searchResponse);
    });

    it('returns recentAnomalies with jobId, jobName, timestamp, and anomalousValue', async () => {
      const result = await getEntityAnomalyOverview(baseParams);

      expect(result.recentAnomalies).toHaveLength(2);
      expect(result.recentAnomalies[0]).toMatchObject({
        jobId: JOB_A,
        jobName: 'Job A',
        timestamp: new Date(rawHit1.timestamp).toISOString(),
        anomalousValue: '13',
      });
      expect(result.recentAnomalies[1]).toMatchObject({
        jobId: JOB_B,
        jobName: 'Job B',
        timestamp: new Date(rawHit2.timestamp).toISOString(),
        anomalousValue: 'Crimea',
      });
    });

    it('uses by_field_value as anomalousValue for rare detectors', async () => {
      const result = await getEntityAnomalyOverview(baseParams);

      expect(result.recentAnomalies[1].anomalousValue).toBe('Crimea');
    });

    it('uses actual[0] as anomalousValue for non-rare detectors', async () => {
      const result = await getEntityAnomalyOverview(baseParams);

      expect(result.recentAnomalies[0].anomalousValue).toBe('13');
    });

    it('counts tactic occurrences using all_jobs doc_count', async () => {
      const result = await getEntityAnomalyOverview(baseParams);

      // JOB_A doc_count: 4, tactics: Execution, Discovery → each gets 4
      // JOB_B doc_count: 1, tactics: Persistence → gets 1
      expect(result.tacticCounts).toEqual({
        Execution: 4,
        Discovery: 4,
        Persistence: 1,
      });
    });

    it('returns the total anomaly count from hits.total', async () => {
      const result = await getEntityAnomalyOverview(baseParams);

      expect(result.totalAnomaliesCount).toBe(5);
    });

    it('returns the effective from/to timestamps', async () => {
      const result = await getEntityAnomalyOverview(baseParams);

      expect(result.from).toBe(FROM_MS);
      expect(result.to).toBe(TO_MS);
    });
  });

  describe('tactic filtering', () => {
    it('filters jobs to those matching requested threatTactics before searching', async () => {
      const jobConfigMap = new Map([
        [
          'job-execution',
          { jobName: null, threatTactics: ['Execution'], threatTechniques: [], detectors: [] },
        ],
        [
          'job-persistence',
          { jobName: null, threatTactics: ['Persistence'], threatTechniques: [], detectors: [] },
        ],
      ]);

      mockGetSecurityMlJobIds.mockResolvedValue(['job-execution', 'job-persistence']);
      mockGetJobConfig.mockResolvedValue(jobConfigMap);
      mockMlAnomalySearch.mockResolvedValue(makeSearchResponse([], [], 0));

      await getEntityAnomalyOverview({ ...baseParams, threatTactics: ['Execution'] });

      const searchCall = mockMlAnomalySearch.mock.calls[0][0];
      const jobTermsFilter = searchCall.query.bool.filter.find(
        (f: Record<string, unknown>) => f.terms !== undefined
      );
      expect(jobTermsFilter?.terms?.job_id).toEqual(['job-execution']);
    });

    it('passes all jobs when threatTactics is empty', async () => {
      const jobConfigMap = new Map([
        [
          'job-a',
          { jobName: null, threatTactics: ['Execution'], threatTechniques: [], detectors: [] },
        ],
        [
          'job-b',
          { jobName: null, threatTactics: ['Persistence'], threatTechniques: [], detectors: [] },
        ],
      ]);

      mockGetSecurityMlJobIds.mockResolvedValue(['job-a', 'job-b']);
      mockGetJobConfig.mockResolvedValue(jobConfigMap);
      mockMlAnomalySearch.mockResolvedValue(makeSearchResponse([], [], 0));

      await getEntityAnomalyOverview({ ...baseParams, threatTactics: [] });

      const searchCall = mockMlAnomalySearch.mock.calls[0][0];
      const jobTermsFilter = searchCall.query.bool.filter.find(
        (f: Record<string, unknown>) => f.terms !== undefined
      );
      expect(jobTermsFilter?.terms?.job_id).toEqual(['job-a', 'job-b']);
    });
  });

  describe('default time range', () => {
    it('defaults to the last 30 days when fromMs/toMs are omitted', async () => {
      mockGetSecurityMlJobIds.mockResolvedValue([]);

      const before = Date.now();
      const result = await getEntityAnomalyOverview({
        entityId: 'entity-1',
        entityType: 'host' as const,
        logger: mockLogger,
        ml: mockMl,
        soClient: mockSoClient,
      });
      const after = Date.now();

      const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;
      expect(result.to).toBeGreaterThanOrEqual(before);
      expect(result.to).toBeLessThanOrEqual(after);
      expect(result.to - result.from).toBeCloseTo(thirtyDaysMs, -3);
    });
  });
});
