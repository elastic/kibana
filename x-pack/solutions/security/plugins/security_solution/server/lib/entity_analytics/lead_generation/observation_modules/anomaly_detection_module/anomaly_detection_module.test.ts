/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggingSystemMock } from '@kbn/core/server/mocks';
import type { KibanaRequest, SavedObjectsClientContract } from '@kbn/core/server';
import type { MlPluginSetup } from '@kbn/ml-plugin/server';
import type { LeadEntity } from '../../types';

const mockGetSecurityMlJobIds = jest.fn();
jest.mock('../../../ml_anomaly_detection/get_security_ml_job_ids', () => ({
  getSecurityMlJobIds: (...args: unknown[]) => mockGetSecurityMlJobIds(...args),
}));

import { createAnomalyDetectionModule } from './module';
import { buildAnomalyObservation } from './observations';
import { fetchAnomalySummariesForEntities } from './data_access';
import type { EntityAnomalySummary } from './config';

const logger = loggingSystemMock.createLogger();

const buildEntity = (type: string, name: string): LeadEntity => {
  const id = `${type}:${name}`;
  return {
    id,
    type,
    name,
    record: { entity: { id, type, name } } as unknown as LeadEntity['record'],
  };
};

const fakeRequest = {} as KibanaRequest;
const fakeSoClient = {} as SavedObjectsClientContract;

describe('anomaly_detection_module', () => {
  afterEach(() => jest.clearAllMocks());

  describe('createAnomalyDetectionModule', () => {
    const fakeMl = { mlSystemProvider: jest.fn() } as unknown as MlPluginSetup;

    it('exposes the anomaly_detection module weight', () => {
      const module = createAnomalyDetectionModule({
        logger,
        ml: fakeMl,
        request: fakeRequest,
        soClient: fakeSoClient,
      });
      expect(module.config.weight).toBe(0.8);
    });

    it('is disabled when ML dependencies are missing', () => {
      expect(createAnomalyDetectionModule({ logger }).isEnabled()).toBe(false);
      expect(createAnomalyDetectionModule({ logger, ml: fakeMl }).isEnabled()).toBe(false);
    });

    it('is enabled when all ML dependencies are present', () => {
      const module = createAnomalyDetectionModule({
        logger,
        ml: fakeMl,
        request: fakeRequest,
        soClient: fakeSoClient,
      });
      expect(module.isEnabled()).toBe(true);
    });

    it('collects no observations when disabled', async () => {
      const module = createAnomalyDetectionModule({ logger });
      expect(await module.collect([buildEntity('user', 'alice')])).toEqual([]);
    });
  });

  describe('buildAnomalyObservation', () => {
    it('builds an observation with severity derived from the max record score', () => {
      const summary: EntityAnomalySummary = {
        maxRecordScore: 92,
        anomalyCount: 2,
        topAnomalies: [
          {
            jobId: 'job-1',
            detectorFunction: 'high_count',
            recordScore: 92,
            timestamp: 1_700_000_000_000,
            byFieldName: 'event.action',
            byFieldValue: 'logon',
            actual: 400,
            typical: 5,
          },
          {
            jobId: 'job-1',
            detectorFunction: 'rare',
            recordScore: 60,
            timestamp: 1_700_000_000_000,
          },
        ],
      };

      const observation = buildAnomalyObservation(buildEntity('user', 'alice'), summary);

      expect(observation.type).toBe('ml_anomaly');
      expect(observation.severity).toBe('critical');
      expect(observation.score).toBe(92);
      expect(observation.description).toContain('2 ML-detected anomalies');
      expect(observation.description).toContain('high_count');
      expect(observation.metadata.anomaly_count).toBe(2);
      expect(observation.metadata.job_ids).toEqual(['job-1']);
    });

    it('maps mid-range scores to medium severity', () => {
      const summary: EntityAnomalySummary = {
        maxRecordScore: 55,
        anomalyCount: 1,
        topAnomalies: [{ jobId: 'j', detectorFunction: 'mean', recordScore: 55, timestamp: 1 }],
      };

      expect(buildAnomalyObservation(buildEntity('host', 'h1'), summary).severity).toBe('medium');
    });
  });

  describe('fetchAnomalySummariesForEntities', () => {
    it('returns an empty map when there are no security ML jobs', async () => {
      mockGetSecurityMlJobIds.mockResolvedValue([]);
      const mlSystemProvider = jest.fn();
      const ml = { mlSystemProvider } as unknown as MlPluginSetup;

      const result = await fetchAnomalySummariesForEntities({
        ml,
        request: fakeRequest,
        soClient: fakeSoClient,
        entities: [buildEntity('user', 'alice')],
        logger,
      });

      expect(result.size).toBe(0);
      expect(mlSystemProvider).not.toHaveBeenCalled();
    });

    it('aggregates anomalies per entity keyed by EUID', async () => {
      mockGetSecurityMlJobIds.mockResolvedValue(['job-1']);
      const mlAnomalySearch = jest.fn().mockResolvedValue({
        aggregations: {
          by_entity: {
            buckets: [
              {
                key: 'user:alice',
                doc_count: 1,
                max_score: { value: 88 },
                top: {
                  hits: {
                    hits: [
                      {
                        _source: {
                          job_id: 'job-1',
                          function: 'high_distinct_count',
                          record_score: 88,
                          timestamp: 1_700_000_000_000,
                          by_field_name: 'process.name',
                          by_field_value: 'powershell.exe',
                          actual: [42],
                          typical: [2],
                        },
                      },
                    ],
                  },
                },
              },
            ],
          },
        },
      });
      const ml = {
        mlSystemProvider: jest.fn().mockReturnValue({ mlAnomalySearch }),
      } as unknown as MlPluginSetup;

      const result = await fetchAnomalySummariesForEntities({
        ml,
        request: fakeRequest,
        soClient: fakeSoClient,
        entities: [buildEntity('user', 'alice')],
        logger,
      });

      expect(mlAnomalySearch).toHaveBeenCalledTimes(1);
      const summary = result.get('user:alice');
      expect(summary?.maxRecordScore).toBe(88);
      expect(summary?.anomalyCount).toBe(1);
      expect(summary?.topAnomalies[0].detectorFunction).toBe('high_distinct_count');
      expect(summary?.topAnomalies[0].actual).toBe(42);
    });

    it('reports the full-bucket anomaly count, not the capped top-hits list', async () => {
      mockGetSecurityMlJobIds.mockResolvedValue(['job-1']);
      const makeHit = (score: number) => ({
        _source: {
          job_id: 'job-1',
          function: 'high_count',
          record_score: score,
          timestamp: 1_700_000_000_000,
          by_field_name: 'event.action',
          by_field_value: 'logon',
        },
      });
      const mlAnomalySearch = jest.fn().mockResolvedValue({
        aggregations: {
          by_entity: {
            buckets: [
              {
                key: 'user:alice',
                // Terms bucket total for the filtered query far exceeds the
                // number of records retained by the top-hits sub-aggregation.
                doc_count: 40,
                max_score: { value: 95 },
                top: { hits: { hits: [makeHit(95), makeHit(80), makeHit(70)] } },
              },
            ],
          },
        },
      });
      const ml = {
        mlSystemProvider: jest.fn().mockReturnValue({ mlAnomalySearch }),
      } as unknown as MlPluginSetup;

      const result = await fetchAnomalySummariesForEntities({
        ml,
        request: fakeRequest,
        soClient: fakeSoClient,
        entities: [buildEntity('user', 'alice')],
        logger,
      });

      const summary = result.get('user:alice');
      expect(summary?.anomalyCount).toBe(40);
      expect(summary?.topAnomalies).toHaveLength(3);
    });

    it('swallows search errors and continues', async () => {
      mockGetSecurityMlJobIds.mockResolvedValue(['job-1']);
      const ml = {
        mlSystemProvider: jest.fn().mockReturnValue({
          mlAnomalySearch: jest.fn().mockRejectedValue(new Error('boom')),
        }),
      } as unknown as MlPluginSetup;

      const result = await fetchAnomalySummariesForEntities({
        ml,
        request: fakeRequest,
        soClient: fakeSoClient,
        entities: [buildEntity('user', 'alice')],
        logger,
      });

      expect(result.size).toBe(0);
    });
  });
});
