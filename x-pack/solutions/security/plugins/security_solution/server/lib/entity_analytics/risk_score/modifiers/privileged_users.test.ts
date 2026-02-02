/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggingSystemMock } from '@kbn/core/server/mocks';
import type { Logger } from '@kbn/core/server';

import type { PrivmonUserCrudService } from '../../privilege_monitoring/users/privileged_users_crud';
import type { RiskScoreBucket } from '../../types';
import type { MonitoredUserDoc } from '../../../../../common/api/entity_analytics';

import { applyPrivmonModifier, PRIVILEGED_USER_MODIFIER } from './privileged_users';
import { allowedExperimentalValues } from '../../../../../common';

// No need to mock bayesianUpdate - we'll use the actual implementation

describe('applyPrivmonModifier', () => {
  let logger: Logger;
  let privmonUserCrudService: jest.Mocked<PrivmonUserCrudService>;

  const mockBucket: RiskScoreBucket = {
    key: { 'user.name': 'test-user' },
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
    key: { 'user.name': 'test-user-2' },
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
    identifierField: 'user.name',
    bounds: {
      lower: 'test-user-a',
      upper: 'test-user-z',
    },
  };

  const experimentalFeatures = {
    ...allowedExperimentalValues,
    enableRiskScorePrivmonModifier: true,
  };

  beforeEach(() => {
    logger = loggingSystemMock.createLogger();
    privmonUserCrudService = {
      create: jest.fn(),
      get: jest.fn(),
      update: jest.fn(),
      list: jest.fn().mockResolvedValue([]),
      delete: jest.fn(),
    };
    jest.clearAllMocks();
  });

  describe('with empty buckets', () => {
    it('should return empty array', async () => {
      const result = await applyPrivmonModifier({
        page: {
          buckets: [],
          identifierField: 'user.name',
          bounds: {
            lower: 'a',
            upper: 'z',
          },
        },
        deps: {
          privmonUserCrudService,
          logger,
        },
        experimentalFeatures,
      });

      expect(result).toEqual([]);
      expect(privmonUserCrudService.list).not.toHaveBeenCalled();
    });
  });

  describe('boundary validation', () => {
    it('should throw error when neither lower nor upper bound is provided', async () => {
      await expect(
        applyPrivmonModifier({
          page: {
            buckets: [mockBucket],
            identifierField: 'user.name',
            bounds: {},
          },
          deps: {
            privmonUserCrudService,
            logger,
          },
          experimentalFeatures,
        })
      ).rejects.toThrow('Either lower or upper after key must be provided for pagination');
    });

    it('should accept only lower bound', async () => {
      privmonUserCrudService.list.mockResolvedValue([]);
      await applyPrivmonModifier({
        page: {
          buckets: [mockBucket],
          identifierField: 'user.name',
          bounds: {
            lower: 'test-user-a',
          },
        },
        deps: {
          privmonUserCrudService,
          logger,
        },
        experimentalFeatures,
      });

      expect(privmonUserCrudService.list).toHaveBeenCalledWith('user.name > test-user-a');
    });

    it('should accept only upper bound', async () => {
      privmonUserCrudService.list.mockResolvedValue([]);
      await applyPrivmonModifier({
        page: {
          buckets: [mockBucket],
          identifierField: 'user.name',
          bounds: {
            upper: 'test-user-z',
          },
        },
        deps: {
          privmonUserCrudService,
          logger,
        },
        experimentalFeatures,
      });

      expect(privmonUserCrudService.list).toHaveBeenCalledWith('user.name <= test-user-z');
    });

    it('should combine both bounds with "and"', async () => {
      privmonUserCrudService.list.mockResolvedValue([]);
      await applyPrivmonModifier({
        page: mockPage,
        deps: {
          privmonUserCrudService,
          logger,
        },
        experimentalFeatures,
      });

      expect(privmonUserCrudService.list).toHaveBeenCalledWith(
        'user.name > test-user-a and user.name <= test-user-z'
      );
    });
  });

  describe('with privileged users', () => {
    const mockPrivilegedUser: MonitoredUserDoc = {
      id: 'user-1',
      user: {
        name: 'test-user',
        is_privileged: true,
      },
      '@timestamp': '2023-01-01T00:00:00.000Z',
    };

    beforeEach(() => {
      privmonUserCrudService.list.mockResolvedValue([mockPrivilegedUser]);
    });

    it('should retrieve privileged users with correct KQL query', async () => {
      await applyPrivmonModifier({
        page: mockPage,
        deps: {
          privmonUserCrudService,
          logger,
        },
        experimentalFeatures,
      });

      expect(privmonUserCrudService.list).toHaveBeenCalledWith(
        'user.name > test-user-a and user.name <= test-user-z'
      );
    });

    it('should apply privmon modifier to matching user', async () => {
      const result = await applyPrivmonModifier({
        page: mockPage,
        deps: {
          privmonUserCrudService,
          logger,
        },
        experimentalFeatures,
      });

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        modifier_value: 1.5,
        type: 'watchlist',
        subtype: 'privmon',
        metadata: {
          is_privileged_user: true,
        },
      });
      expect(result[1]).toBeUndefined();
    });

    it('should use PRIVILEGED_USER_MODIFIER constant (value: 1)', async () => {
      const result = await applyPrivmonModifier({
        page: mockPage,
        deps: {
          privmonUserCrudService,
          logger,
        },
        experimentalFeatures,
      });

      // Verify the modifier is applied (result should have privileged_user_modifier set)
      expect(result[0]?.modifier_value).toBe(PRIVILEGED_USER_MODIFIER);
    });
  });

  describe('without privileged users', () => {
    beforeEach(() => {
      privmonUserCrudService.list.mockResolvedValue([]);
    });

    it('should return non-privileged status for all users', async () => {
      const result = await applyPrivmonModifier({
        page: mockPage,
        deps: {
          privmonUserCrudService,
          logger,
        },
        experimentalFeatures,
      });

      expect(result).toHaveLength(2);
      expect(result).toEqual([undefined, undefined]);
    });
  });

  describe('with users that have is_privileged false', () => {
    beforeEach(() => {
      privmonUserCrudService.list.mockResolvedValue([
        {
          id: 'user-1',
          user: {
            name: 'test-user',
            is_privileged: false,
          },
          '@timestamp': '2023-01-01T00:00:00.000Z',
        },
      ]);
    });

    it('should not apply modifier when is_privileged is false', async () => {
      const result = await applyPrivmonModifier({
        experimentalFeatures,
        page: mockPage,
        deps: {
          privmonUserCrudService,
          logger,
        },
      });

      expect(result[0]).toBeUndefined();
    });
  });

  describe('with users missing name or is_privileged', () => {
    beforeEach(() => {
      privmonUserCrudService.list.mockResolvedValue([
        {
          id: 'user-1',
          user: {
            name: 'test-user',
          },
          '@timestamp': '2023-01-01T00:00:00.000Z',
        } as MonitoredUserDoc,
        {
          id: 'user-2',
          user: {
            is_privileged: true,
          },
          '@timestamp': '2023-01-01T00:00:00.000Z',
        } as MonitoredUserDoc,
      ]);
    });

    it('should handle users with missing properties gracefully', async () => {
      const result = await applyPrivmonModifier({
        experimentalFeatures,
        page: mockPage,
        deps: {
          privmonUserCrudService,
          logger,
        },
      });

      expect(result).toEqual([undefined, undefined]);
    });
  });

  describe('error handling', () => {
    beforeEach(() => {
      privmonUserCrudService.list.mockRejectedValue(new Error('Service unavailable'));
    });

    it('should handle errors gracefully and return non-privileged status', async () => {
      const result = await applyPrivmonModifier({
        experimentalFeatures,
        page: mockPage,
        deps: {
          privmonUserCrudService,
          logger,
        },
      });

      expect(logger.warn).toHaveBeenCalledWith(
        expect.stringContaining('Error retrieving privileged users')
      );
      expect(result).toEqual([undefined, undefined]);
    });

    it('should continue scoring when service fails', async () => {
      const result = await applyPrivmonModifier({
        experimentalFeatures,
        page: mockPage,
        deps: {
          privmonUserCrudService,
          logger,
        },
      });

      expect(result).toHaveLength(2);
      expect(privmonUserCrudService.list).toHaveBeenCalled();
    });
  });

  describe('with multiple privileged users', () => {
    beforeEach(() => {
      privmonUserCrudService.list.mockResolvedValue([
        {
          id: 'user-1',
          user: {
            name: 'test-user',
            is_privileged: true,
          },
          '@timestamp': '2023-01-01T00:00:00.000Z',
        },
        {
          id: 'user-2',
          user: {
            name: 'test-user-2',
            is_privileged: true,
          },
          '@timestamp': '2023-01-01T00:00:00.000Z',
        },
      ]);
    });

    it('should apply modifier to all privileged users', async () => {
      const result = await applyPrivmonModifier({
        experimentalFeatures,
        page: mockPage,
        deps: {
          privmonUserCrudService,
          logger,
        },
      });

      expect(result[0]).toEqual({
        type: 'watchlist',
        subtype: 'privmon',
        modifier_value: 1.5,
        metadata: {
          is_privileged_user: true,
        },
      });
      expect(result[1]).toEqual({
        type: 'watchlist',
        subtype: 'privmon',
        modifier_value: 1.5,
        metadata: {
          is_privileged_user: true,
        },
      });
    });
  });

  describe('with different identifier fields', () => {
    const hostBucket: RiskScoreBucket = {
      key: { 'host.name': 'test-host' },
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
      privmonUserCrudService.list.mockResolvedValue([]);
    });

    it('should construct KQL query with correct identifier field', async () => {
      await applyPrivmonModifier({
        experimentalFeatures,
        page: {
          buckets: [hostBucket],
          identifierField: 'host.name',
          bounds: {
            lower: 'a',
            upper: 'z',
          },
        },
        deps: {
          privmonUserCrudService,
          logger,
        },
      });

      expect(privmonUserCrudService.list).toHaveBeenCalledWith('host.name > a and host.name <= z');
    });
  });
});
