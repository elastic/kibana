/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ElasticsearchClient } from '@kbn/core/server';
import { elasticsearchServiceMock } from '@kbn/core/server/mocks';
import { Duration, DurationUnit } from '@kbn/slo-schema';
import { createSLO, createSLOWithCalendarTimeWindow } from './fixtures/slo';
import { createSLORepositoryMock } from './mocks';
import { SLORepository } from './slo_repository';
import { BulkPurgeRollupData } from './bulk_purge_rollup_data';
import { monthlyCalendarAligned } from './fixtures/time_window';

describe('purge rollup data', () => {
  let mockRepository: jest.Mocked<SLORepository>;
  let mockEsClient: jest.Mocked<ElasticsearchClient>;
  let purgeRollupData: BulkPurgeRollupData;

  jest.useFakeTimers().setSystemTime(new Date('2025-04-24'));

  beforeEach(() => {
    mockRepository = createSLORepositoryMock();
    mockEsClient = elasticsearchServiceMock.createElasticsearchClient();
    purgeRollupData = new BulkPurgeRollupData(mockEsClient, mockRepository);
  });

  describe('happy path', () => {
    it('successfully makes a query to remove SLI data older than 30 days', async () => {
      const slo = createSLO({
        id: 'test1',
        // default includes 7 day rolling window
      });
      mockRepository.findAllByIds.mockResolvedValueOnce([slo]);

      await purgeRollupData.execute({
        list: ['test1'],
        purgePolicy: { purgeType: 'fixed_age', age: new Duration(30, DurationUnit.Day) },
      });

      expect(mockRepository.findAllByIds).toMatchSnapshot();
      expect(mockEsClient.deleteByQuery).toMatchSnapshot();
    });

    it('successfully makes a query to remove SLI data older than a week', async () => {
      const slo = createSLOWithCalendarTimeWindow({
        id: 'test2',
      });
      mockRepository.findAllByIds.mockResolvedValueOnce([slo]);

      await purgeRollupData.execute({
        list: ['test2'],
        purgePolicy: { purgeType: 'fixed_age', age: new Duration(2, DurationUnit.Week) },
      });

      expect(mockRepository.findAllByIds).toMatchSnapshot();
      expect(mockEsClient.deleteByQuery).toMatchSnapshot();
    });

    it('successfully makes a query to remove SLI data based on a timestamp - month', async () => {
      const slo = createSLO({
        id: 'test3',
        timeWindow: monthlyCalendarAligned(),
      });
      mockRepository.findAllByIds.mockResolvedValueOnce([slo]);

      await purgeRollupData.execute({
        list: ['test3'],
        purgePolicy: { purgeType: 'fixed_time', timestamp: new Date('2025-03-01T00:00:00Z') },
      });

      expect(mockEsClient.deleteByQuery).toMatchSnapshot();
    });

    it('successfully makes a query to remove SLI data based on a timestamp - week', async () => {
      const slo = createSLOWithCalendarTimeWindow({
        id: 'test4',
      });
      mockRepository.findAllByIds.mockResolvedValueOnce([slo]);

      await purgeRollupData.execute({
        list: ['test4'],
        purgePolicy: { purgeType: 'fixed_time', timestamp: new Date('2025-04-01T00:00:00Z') },
      });

      expect(mockEsClient.deleteByQuery).toMatchSnapshot();
    });

    it('successfully makes a forced query to remove recently added SLI data', async () => {
      const slo = createSLOWithCalendarTimeWindow({
        id: 'test5',
      });
      mockRepository.findAllByIds.mockResolvedValueOnce([slo]);

      await purgeRollupData.execute({
        list: ['test5'],
        purgePolicy: {
          purgeType: 'fixed_age',
          age: new Duration(1, DurationUnit.Day),
        },
        force: true,
      });

      expect(mockEsClient.deleteByQuery).toMatchSnapshot();
    });
  });

  describe('error path', () => {
    it('fails to make a query to remove SLI data older than 7 days', async () => {
      const slo = createSLO({
        id: 'test1',
        // default includes 7 day rolling window
      });
      mockRepository.findAllByIds.mockResolvedValueOnce([slo]);

      await expect(
        purgeRollupData.execute({
          list: ['test1'],
          purgePolicy: { purgeType: 'fixed_age', age: new Duration(3, DurationUnit.Day) },
        })
      ).rejects.toThrowErrorMatchingInlineSnapshot(
        `"The provided purge policy is invalid. At least one SLO has a time window that is longer than the provided purge policy."`
      );

      expect(mockEsClient.deleteByQuery).toHaveBeenCalledTimes(0);
    });

    it('fails to make a query to remove SLI data older than a day', async () => {
      const slo = createSLOWithCalendarTimeWindow({
        id: 'test2',
      });
      mockRepository.findAllByIds.mockResolvedValueOnce([slo]);

      await expect(
        purgeRollupData.execute({
          list: ['test2'],
          purgePolicy: { purgeType: 'fixed_age', age: new Duration(1, DurationUnit.Day) },
        })
      ).rejects.toThrowErrorMatchingInlineSnapshot(
        `"The provided purge policy is invalid. At least one SLO has a time window that is longer than the provided purge policy."`
      );

      expect(mockEsClient.deleteByQuery).toHaveBeenCalledTimes(0);
    });

    it('fails to makes a query to remove SLI data based on a timestamp', async () => {
      const slo = createSLOWithCalendarTimeWindow({
        id: 'test3',
      });
      mockRepository.findAllByIds.mockResolvedValueOnce([slo]);

      await expect(
        purgeRollupData.execute({
          list: ['test3'],
          purgePolicy: { purgeType: 'fixed_time', timestamp: new Date() },
        })
      ).rejects.toThrowErrorMatchingInlineSnapshot(
        `"The provided purge policy is invalid. At least one SLO has a time window that is longer than the provided purge policy."`
      );

      expect(mockEsClient.deleteByQuery).toHaveBeenCalledTimes(0);
    });
  });
});
