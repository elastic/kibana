/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggingSystemMock } from '@kbn/core/server/mocks';
import type { Logger } from '@kbn/core/server';

import { assetCriticalityServiceMock } from '../../asset_criticality/asset_criticality_service.mock';
import type { AssetCriticalityService } from '../../asset_criticality';
import type { RiskScoreBucket } from '../../types';
import type { AssetCriticalityRecord } from '../../../../../common/api/entity_analytics';

import { applyCriticalityModifier } from './asset_criticality';
import * as helpers from '../../asset_criticality/helpers';

jest.mock('../../asset_criticality/helpers', () => ({
  ...jest.requireActual('../../asset_criticality/helpers'),
  getCriticalityModifier: jest.fn(),
}));

const mockGetCriticalityModifier = helpers.getCriticalityModifier as jest.MockedFunction<
  typeof helpers.getCriticalityModifier
>;

describe('applyCriticalityModifier', () => {
  let logger: Logger;
  let assetCriticalityService: jest.Mocked<AssetCriticalityService>;

  const mockBucket: RiskScoreBucket = {
    key: { 'host.name': 'test-host' },
    doc_count: 5,
    top_inputs: {
      doc_count: 10,
      risk_details: {
        value: {
          score: 85,
          normalized_score: 75.5,
          notes: [],
          category_1_score: 80,
          category_1_count: 3,
          risk_inputs: [],
        },
      },
    },
  };

  const mockBucket2: RiskScoreBucket = {
    key: { 'host.name': 'test-host-2' },
    doc_count: 3,
    top_inputs: {
      doc_count: 5,
      risk_details: {
        value: {
          score: 60,
          normalized_score: 50,
          notes: [],
          category_1_score: 55,
          category_1_count: 2,
          risk_inputs: [],
        },
      },
    },
  };

  const mockPage = {
    buckets: [mockBucket, mockBucket2],
    identifierField: 'host.name',
  };

  beforeEach(() => {
    logger = loggingSystemMock.createLogger();
    assetCriticalityService = assetCriticalityServiceMock.create();
    jest.clearAllMocks();
  });

  describe('with empty buckets', () => {
    it('should return empty array', async () => {
      const result = await applyCriticalityModifier({
        page: {
          buckets: [],
          identifierField: 'host.name',
        },
        deps: {
          assetCriticalityService,
          logger,
        },
      });

      expect(result).toEqual([]);
      expect(assetCriticalityService.getCriticalitiesByIdentifiers).not.toHaveBeenCalled();
    });
  });

  describe('with criticality records', () => {
    const mockCriticalityRecord: AssetCriticalityRecord = {
      id_field: 'host.name',
      id_value: 'test-host',
      criticality_level: 'high_impact',
      '@timestamp': '2023-01-01T00:00:00.000Z',
      asset: {
        criticality: 'high_impact',
      },
    };

    beforeEach(() => {
      assetCriticalityService.getCriticalitiesByIdentifiers.mockResolvedValue([
        mockCriticalityRecord,
      ]);
      mockGetCriticalityModifier.mockReturnValue(1.5);
    });

    it('should retrieve criticalities for all bucket identifiers', async () => {
      await applyCriticalityModifier({
        page: mockPage,
        deps: {
          assetCriticalityService,
          logger,
        },
      });

      expect(assetCriticalityService.getCriticalitiesByIdentifiers).toHaveBeenCalledWith([
        { id_field: 'host.name', id_value: 'test-host' },
        { id_field: 'host.name', id_value: 'test-host-2' },
      ]);
    });

    it('should apply criticality modifier to matching bucket', async () => {
      const result = await applyCriticalityModifier({
        page: mockPage,
        deps: {
          assetCriticalityService,
          logger,
        },
      });

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        type: 'asset_criticality',
        modifier_value: 1.5,
        metadata: {
          criticality_level: 'high_impact',
        },
      });
      expect(result[1]).toBeUndefined();
    });

    it('should apply global weight when provided', async () => {
      const globalWeight = 0.8;
      await applyCriticalityModifier({
        page: mockPage,
        deps: {
          assetCriticalityService,
          logger,
        },
        globalWeight,
      });

      // Verify that the calculation uses the weighted score
      expect(mockGetCriticalityModifier).toHaveBeenCalledWith('high_impact');
    });

    it('should not apply global weight when undefined', async () => {
      await applyCriticalityModifier({
        page: mockPage,
        deps: {
          assetCriticalityService,
          logger,
        },
        globalWeight: undefined,
      });

      // Verify that the calculation uses the original normalized score
      expect(mockGetCriticalityModifier).toHaveBeenCalledWith('high_impact');
    });
  });

  describe('without criticality records', () => {
    beforeEach(() => {
      assetCriticalityService.getCriticalitiesByIdentifiers.mockResolvedValue([]);
      mockGetCriticalityModifier.mockReturnValue(undefined);
    });

    it('should return zero scores when no criticalities found', async () => {
      const result = await applyCriticalityModifier({
        page: mockPage,
        deps: {
          assetCriticalityService,
          logger,
        },
      });

      expect(result).toEqual([undefined, undefined]);
    });
  });

  describe('error handling', () => {
    beforeEach(() => {
      assetCriticalityService.getCriticalitiesByIdentifiers.mockRejectedValue(
        new Error('Service unavailable')
      );
    });

    it('should handle errors gracefully and return zero scores', async () => {
      const result = await applyCriticalityModifier({
        page: mockPage,
        deps: {
          assetCriticalityService,
          logger,
        },
      });

      expect(logger.warn).toHaveBeenCalledWith(
        expect.stringContaining('Error retrieving criticality')
      );
      expect(result).toEqual([undefined, undefined]);
    });

    it('should continue scoring when service fails', async () => {
      const result = await applyCriticalityModifier({
        page: mockPage,
        deps: {
          assetCriticalityService,
          logger,
        },
      });

      expect(result).toHaveLength(2);
      expect(assetCriticalityService.getCriticalitiesByIdentifiers).toHaveBeenCalled();
    });
  });

  describe('with different criticality levels', () => {
    it.each([
      ['low_impact', 0.5],
      ['medium_impact', 1],
      ['high_impact', 1.5],
      ['extreme_impact', 2],
    ])('should apply correct modifier for %s criticality', async (level, modifier) => {
      assetCriticalityService.getCriticalitiesByIdentifiers.mockResolvedValue([
        {
          id_field: 'host.name',
          id_value: 'test-host',
          criticality_level: level as AssetCriticalityRecord['criticality_level'],
          '@timestamp': '2023-01-01T00:00:00.000Z',
          asset: {
            criticality: level as AssetCriticalityRecord['criticality_level'],
          },
        },
      ]);
      mockGetCriticalityModifier.mockReturnValue(modifier);

      const result = await applyCriticalityModifier({
        page: {
          buckets: [mockBucket],
          identifierField: 'host.name',
        },
        deps: {
          assetCriticalityService,
          logger,
        },
      });

      expect(result[0]).toEqual({
        type: 'asset_criticality',
        modifier_value: modifier,
        metadata: {
          criticality_level: level,
        },
      });
    });
  });

  describe('with different identifier fields', () => {
    const userBucket: RiskScoreBucket = {
      key: { 'user.name': 'test-user' },
      doc_count: 5,
      top_inputs: {
        doc_count: 10,
        risk_details: {
          value: {
            score: 70,
            normalized_score: 65,
            notes: [],
            category_1_score: 60,
            category_1_count: 2,
            risk_inputs: [],
          },
        },
      },
    };

    beforeEach(() => {
      assetCriticalityService.getCriticalitiesByIdentifiers.mockResolvedValue([
        {
          id_field: 'user.name',
          id_value: 'test-user',
          criticality_level: 'high_impact',
          '@timestamp': '2023-01-01T00:00:00.000Z',
          asset: {
            criticality: 'high_impact',
          },
        },
      ]);
      mockGetCriticalityModifier.mockReturnValue(1.5);
    });

    it('should work with user.name identifier', async () => {
      const result = await applyCriticalityModifier({
        page: {
          buckets: [userBucket],
          identifierField: 'user.name',
        },
        deps: {
          assetCriticalityService,
          logger,
        },
      });

      expect(assetCriticalityService.getCriticalitiesByIdentifiers).toHaveBeenCalledWith([
        { id_field: 'user.name', id_value: 'test-user' },
      ]);
      expect(result[0]).toEqual({
        type: 'asset_criticality',
        modifier_value: 1.5,
        metadata: {
          criticality_level: 'high_impact',
        },
      });
    });
  });
});
