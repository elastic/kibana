/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggingSystemMock } from '@kbn/core/server/mocks';
import type { Logger } from '@kbn/core/server';

import { assetCriticalityServiceMock } from '../asset_criticality/asset_criticality_service.mock';
import type { AssetCriticalityService } from '../asset_criticality';
import type { PrivmonUserCrudService } from '../privilege_monitoring/users/privileged_users_crud';
import { EntityType } from '../../../../common/entity_analytics/types';
import { RiskCategories } from '../../../../common/entity_analytics/risk_engine';

import { applyScoreModifiers, riskScoreDocFactory } from './apply_score_modifiers';
import type { RiskScoreBucket } from '../types';
import { applyCriticalityModifier } from './modifiers/asset_criticality';
import { applyPrivmonModifier } from './modifiers/privileged_users';

import { allowedExperimentalValues } from '../../../../common';
import type { Modifier } from './modifiers/types';

jest.mock('./modifiers/asset_criticality', () => ({
  ...jest.requireActual('./modifiers/asset_criticality'),
  applyCriticalityModifier: jest.fn(),
}));
jest.mock('./modifiers/privileged_users');

const experimentalFeatures = { ...allowedExperimentalValues, enableRiskScorePrivmonModifier: true };

const mockApplyCriticalityModifier = applyCriticalityModifier as jest.MockedFunction<
  typeof applyCriticalityModifier
>;
const mockApplyPrivmonModifier = applyPrivmonModifier as jest.MockedFunction<
  typeof applyPrivmonModifier
>;

describe('applyScoreModifiers', () => {
  let logger: Logger;
  let assetCriticalityService: jest.Mocked<AssetCriticalityService>;
  let privmonUserCrudService: jest.Mocked<PrivmonUserCrudService>;

  const mockBucket: RiskScoreBucket = {
    key: { 'host.name': 'test-host' },
    doc_count: 1,
    top_inputs: {
      doc_count: 1,
      risk_details: {
        value: {
          score: 120,
          normalized_score: 75,
          notes: [],
          category_1_score: 120,
          category_1_count: 1,
          risk_inputs: [
            {
              id: 'alert-1',
              index: '.alerts-security',
              rule_name: 'Test Rule',
              time: '2023-01-01T00:00:00.000Z',
              score: 50,
              contribution: 25,
            },
          ],
        },
      },
    },
  };

  const mockPage = {
    buckets: [mockBucket],
    bounds: {
      lower: 'a',
      upper: 'z',
    },
    identifierField: 'host.name',
  };

  beforeEach(() => {
    logger = loggingSystemMock.createLogger();
    assetCriticalityService = assetCriticalityServiceMock.create();
    privmonUserCrudService = {
      create: jest.fn(),
      get: jest.fn(),
      update: jest.fn(),
      list: jest.fn().mockResolvedValue([]),
      delete: jest.fn(),
    };

    jest.clearAllMocks();
  });

  describe('when both modifiers apply', () => {
    beforeEach(() => {
      mockApplyCriticalityModifier.mockResolvedValue([
        {
          type: 'asset_criticality',
          modifier_value: 1.5,
          metadata: {
            criticality_level: 'high_impact',
          },
        },
      ]);

      mockApplyPrivmonModifier.mockResolvedValue([
        {
          type: 'watchlist',
          subtype: 'privmon',
          modifier_value: 1.5,
          metadata: {
            is_privileged_user: true,
          },
        },
      ]);
    });

    it('should include legacy cat2 fields and new modifiers array when both modifiers apply', async () => {
      const result = await applyScoreModifiers({
        now: '2023-01-01T00:00:00.000Z',
        identifierType: EntityType.host,
        deps: {
          assetCriticalityService,
          privmonUserCrudService,
          logger,
        },
        experimentalFeatures,
        page: mockPage,
      });

      expect(result).toHaveLength(1);
      // Verify legacy cat2 fields are present
      expect(result[0]).toHaveProperty('category_2_score');
      expect(result[0]).toHaveProperty('category_2_count');
      expect(result[0]).toHaveProperty('criticality_level');
      expect(result[0]).toHaveProperty('criticality_modifier');
      // Verify new modifiers array is present
      expect(result[0]).toHaveProperty('modifiers');
      expect(Array.isArray(result[0].modifiers)).toBe(true);
      expect(result[0].modifiers).toHaveLength(2);
      expect(result[0].modifiers?.[0].type).toBe('asset_criticality');
      expect(result[0].modifiers?.[1].type).toBe('watchlist');
    });

    it('should apply both criticality and privmon modifiers', async () => {
      const result = await applyScoreModifiers({
        now: '2023-01-01T00:00:00.000Z',
        identifierType: EntityType.host,
        deps: {
          assetCriticalityService,
          privmonUserCrudService,
          logger,
        },
        experimentalFeatures,
        page: mockPage,
      });

      expect(mockApplyCriticalityModifier).toHaveBeenCalledWith({
        page: mockPage,
        deps: {
          assetCriticalityService,
          logger,
        },
      });

      expect(mockApplyPrivmonModifier).toHaveBeenCalledWith({
        page: mockPage,
        deps: {
          privmonUserCrudService,
          logger,
        },
        experimentalFeatures,
      });

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        id_field: 'host.name',
        id_value: 'test-host',
        category_2_score: 6.0483870968,
        category_2_count: 1,
        criticality_level: 'high_impact',
        criticality_modifier: 1.5,
        modifiers: [
          {
            type: 'asset_criticality',
            modifier_value: 1.5,
            contribution: 6.0483870968,
            metadata: { criticality_level: 'high_impact' },
          },
          {
            type: 'watchlist',
            subtype: 'privmon',
            modifier_value: 1.5,
            contribution: 6.0483870968,
            metadata: { is_privileged_user: true },
          },
        ],

        calculated_score_norm: 87.0967741935, // 75 + 6.0483870968 + 6.0483870968
      });
    });

    it('should include properly formatted risk inputs', async () => {
      const result = await applyScoreModifiers({
        now: '2023-01-01T00:00:00.000Z',
        identifierType: EntityType.host,
        deps: {
          assetCriticalityService,
          privmonUserCrudService,
          logger,
        },
        experimentalFeatures,
        page: mockPage,
      });

      expect(result[0].inputs).toEqual([
        {
          id: 'alert-1',
          index: '.alerts-security',
          description: 'Alert from Rule: Test Rule',
          category: RiskCategories.category_1,
          risk_score: 50,
          timestamp: '2023-01-01T00:00:00.000Z',
          contribution_score: 25,
        },
      ]);
    });
  });

  describe('when only criticality modifier applies', () => {
    beforeEach(() => {
      mockApplyCriticalityModifier.mockResolvedValue([
        {
          type: 'asset_criticality',
          modifier_value: 2,
          metadata: {
            criticality_level: 'extreme_impact',
          },
        },
      ]);

      mockApplyPrivmonModifier.mockResolvedValue([undefined]);
    });

    it('should apply only criticality modifier', async () => {
      const result = await applyScoreModifiers({
        now: '2023-01-01T00:00:00.000Z',
        identifierType: EntityType.user,
        deps: {
          assetCriticalityService,
          privmonUserCrudService,
          logger,
        },
        experimentalFeatures,
        page: mockPage,
      });

      expect(mockApplyCriticalityModifier).toHaveBeenCalled();
      expect(mockApplyPrivmonModifier).toHaveBeenCalled();

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        id_field: 'host.name',
        id_value: 'test-host',
        category_2_score: 10.7142857143,
        category_2_count: 1,
        criticality_level: 'extreme_impact',
        criticality_modifier: 2,
        modifiers: [
          {
            type: 'asset_criticality',
            modifier_value: 2,
            contribution: 10.7142857143,
            metadata: { criticality_level: 'extreme_impact' },
          },
        ],
        calculated_score_norm: 85.7142857143, // 75 + 10.7142857143
      });
    });
  });

  describe('when only privmon modifier applies', () => {
    beforeEach(() => {
      mockApplyCriticalityModifier.mockResolvedValue([undefined]);

      mockApplyPrivmonModifier.mockResolvedValue([
        {
          type: 'watchlist',
          subtype: 'privmon',
          modifier_value: 1.5,
          metadata: {
            is_privileged_user: true,
          },
        },
      ]);
    });

    it('should apply only privmon modifier', async () => {
      const result = await applyScoreModifiers({
        now: '2023-01-01T00:00:00.000Z',
        identifierType: EntityType.user,
        experimentalFeatures,
        deps: {
          assetCriticalityService,
          privmonUserCrudService,
          logger,
        },
        page: mockPage,
      });

      expect(mockApplyCriticalityModifier).toHaveBeenCalled();
      expect(mockApplyPrivmonModifier).toHaveBeenCalled();

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        id_field: 'host.name',
        id_value: 'test-host',
        category_2_score: 0,
        category_2_count: 0,
        modifiers: [
          {
            type: 'watchlist',
            subtype: 'privmon',
            modifier_value: 1.5,
            contribution: 6.8181818182,
            metadata: { is_privileged_user: true },
          },
        ],
        calculated_score_norm: 81.8181818182, // 75 + 6.8181818182
      });
      expect(result[0].criticality_level).toBeUndefined();
      expect(result[0].criticality_modifier).toBeUndefined();
    });
  });

  describe('when no modifiers apply', () => {
    beforeEach(() => {
      mockApplyCriticalityModifier.mockResolvedValue([undefined]);

      mockApplyPrivmonModifier.mockResolvedValue([undefined]);
    });

    it('should return scores without modifiers', async () => {
      const result = await applyScoreModifiers({
        now: '2023-01-01T00:00:00.000Z',
        identifierType: EntityType.host,
        experimentalFeatures,
        deps: {
          assetCriticalityService,
          privmonUserCrudService,
          logger,
        },
        page: mockPage,
      });

      expect(mockApplyCriticalityModifier).toHaveBeenCalled();
      expect(mockApplyPrivmonModifier).toHaveBeenCalled();

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        id_field: 'host.name',
        id_value: 'test-host',
        category_2_score: 0,
        category_2_count: 0,
        calculated_score_norm: 75, // 75 + 0 (base score only)
        modifiers: [],
      });
      expect(result[0].criticality_level).toBeUndefined();
      expect(result[0].criticality_modifier).toBeUndefined();
    });
  });

  describe('with multiple buckets', () => {
    const mockBucket2: RiskScoreBucket = {
      key: { 'host.name': 'test-host-2' },
      doc_count: 1,
      top_inputs: {
        doc_count: 1,
        risk_details: {
          value: {
            score: 60,
            normalized_score: 50,
            notes: ['Note 1'],
            category_1_score: 55,
            category_1_count: 1,
            risk_inputs: [],
          },
        },
      },
    };

    beforeEach(() => {
      mockApplyCriticalityModifier.mockResolvedValue([
        {
          type: 'asset_criticality',
          modifier_value: 1.5,
          metadata: {
            criticality_level: 'high_impact',
          },
        },
        undefined,
      ]);

      mockApplyPrivmonModifier.mockResolvedValue([
        {
          type: 'watchlist',
          subtype: 'privmon',
          modifier_value: 1.5,
          metadata: {
            is_privileged_user: true,
          },
        },
        undefined,
      ]);
    });

    it('should process multiple buckets with different modifier combinations', async () => {
      const multiPage = {
        ...mockPage,
        buckets: [mockBucket, mockBucket2],
      };

      const result = await applyScoreModifiers({
        now: '2023-01-01T00:00:00.000Z',
        identifierType: EntityType.host,
        experimentalFeatures,
        deps: {
          assetCriticalityService,
          privmonUserCrudService,
          logger,
        },
        page: multiPage,
      });

      expect(result).toHaveLength(2);

      // First bucket - both modifiers
      expect(result[0]).toMatchObject({
        id_value: 'test-host',
        category_2_score: 6.0483870968,
        category_2_count: 1,
        criticality_level: 'high_impact',
        criticality_modifier: 1.5,
        modifiers: [
          {
            type: 'asset_criticality',
            modifier_value: 1.5,
            contribution: 6.0483870968,
            metadata: { criticality_level: 'high_impact' },
          },
          {
            type: 'watchlist',
            subtype: 'privmon',
            modifier_value: 1.5,
            contribution: 6.0483870968,
            metadata: { is_privileged_user: true },
          },
        ],
        calculated_score_norm: 87.0967741935, // 75 + 6.0483870968 + 6.0483870968
      });

      // Second bucket - no modifiers
      expect(result[1]).toMatchObject({
        id_value: 'test-host-2',
        category_2_score: 0,
        category_2_count: 0,
        modifiers: [],
        calculated_score_norm: 50, // 50 + 0 (base score only)
      });
      expect(result[1].criticality_level).toBeUndefined();
      expect(result[1].criticality_modifier).toBeUndefined();
    });
  });

  describe('with missing rule name', () => {
    const mockBucketNoRuleName: RiskScoreBucket = {
      ...mockBucket,
      top_inputs: {
        ...mockBucket.top_inputs,
        risk_details: {
          value: {
            ...mockBucket.top_inputs.risk_details.value,
            risk_inputs: [
              {
                id: 'alert-2',
                index: '.alerts-security',
                time: '2023-01-01T00:00:00.000Z',
                score: 30,
                contribution: 15,
              },
            ],
          },
        },
      },
    };

    beforeEach(() => {
      mockApplyCriticalityModifier.mockResolvedValue([undefined]);

      mockApplyPrivmonModifier.mockResolvedValue([undefined]);
    });

    it('should use "RULE_NOT_FOUND" when rule_name is missing', async () => {
      const pageWithNoRuleName = {
        ...mockPage,
        buckets: [mockBucketNoRuleName],
      };

      const result = await applyScoreModifiers({
        now: '2023-01-01T00:00:00.000Z',
        identifierType: EntityType.host,
        experimentalFeatures,
        deps: {
          assetCriticalityService,
          privmonUserCrudService,
          logger,
        },
        page: pageWithNoRuleName,
      });

      expect(result[0].inputs[0].description).toBe('Alert from Rule: RULE_NOT_FOUND');
    });
  });
});

describe('riskScoreDocFactory', () => {
  const now = '2023-01-01T00:00:00.000Z';
  const identifierField = 'user.name';

  const mockBucket: RiskScoreBucket = {
    key: { 'user.name': 'test-user' },
    doc_count: 5,
    top_inputs: {
      doc_count: 10,
      risk_details: {
        value: {
          score: 70,
          normalized_score: 65,
          notes: ['Test note'],
          category_1_score: 259.24, // Raw value before normalization
          category_1_count: 2,
          risk_inputs: [
            {
              id: 'alert-1',
              index: '.alerts-security',
              rule_name: 'Test Rule',
              time: '2023-01-01T00:00:00.000Z',
              score: 40,
              contribution: 20,
            },
          ],
        },
      },
    },
  };

  it('should normalize category_1_score by RIEMANN_ZETA_VALUE', () => {
    const factory = riskScoreDocFactory({ now, identifierField, globalWeight: undefined });

    const result = factory(mockBucket, undefined, undefined);

    // 259.24 / 2.5924 = 100 (approximately)
    expect(result.category_1_score).toBeCloseTo(100, 0);
  });

  it('should apply global weight to calculated_score', () => {
    const globalWeight = 0.8;
    const factory = riskScoreDocFactory({ now, identifierField, globalWeight });

    const result = factory(mockBucket, undefined, undefined);
    expect(result.calculated_score).toBe(56); // 70 * 0.8
  });

  it('should not apply global weight when undefined', () => {
    const factory = riskScoreDocFactory({ now, identifierField, globalWeight: undefined });

    const result = factory(mockBucket, undefined, undefined);
    expect(result.calculated_score).toBe(70); // original score
  });

  it('should calculate total score with all modifiers', () => {
    const factory = riskScoreDocFactory({ now, identifierField, globalWeight: undefined });
    const criticalityFields: Modifier<'asset_criticality'> = {
      type: 'asset_criticality',
      modifier_value: 1.5,
      metadata: {
        criticality_level: 'high_impact',
      },
      // category_2_score: 10,
    };
    const privmonFields: Modifier<'watchlist'> = {
      type: 'watchlist',
      subtype: 'privmon',
      modifier_value: 1.5,
      metadata: {
        is_privileged_user: true,
      },
    };

    const result = factory(mockBucket, criticalityFields, privmonFields);

    expect(result.calculated_score_norm).toBe(80.6896551724); // 65 + contributions from both modifiers

    const criticality = result.modifiers?.find((mod) => mod.type === 'asset_criticality');
    expect(criticality).toBeDefined();
    expect(result.category_2_score).toBe(7.8448275862); // legacy field
    expect(criticality?.contribution).toBe(7.8448275862);
    expect(criticality?.metadata?.criticality_level).toBe('high_impact');

    const privmon = result.modifiers?.find(
      (mod) => mod.type === 'watchlist' && mod.subtype === 'privmon'
    );
    expect(privmon).toBeDefined();
    expect(privmon?.contribution).toBe(7.8448275862);
    expect(privmon?.metadata?.is_privileged_user).toBe(true);
  });

  it('should include all risk inputs with proper formatting', () => {
    const factory = riskScoreDocFactory({ now, identifierField, globalWeight: undefined });

    const result = factory(mockBucket, undefined, undefined);

    expect(result.inputs).toEqual([
      {
        id: 'alert-1',
        index: '.alerts-security',
        description: 'Alert from Rule: Test Rule',
        category: RiskCategories.category_1,
        risk_score: 40,
        timestamp: '2023-01-01T00:00:00.000Z',
        contribution_score: 20,
      },
    ]);
  });

  it('should set correct identifier fields', () => {
    const factory = riskScoreDocFactory({ now, identifierField, globalWeight: undefined });

    const result = factory(mockBucket, undefined, undefined);

    expect(result['@timestamp']).toBe(now);
    expect(result.id_field).toBe('user.name');
    expect(result.id_value).toBe('test-user');
  });

  it('should include notes from risk details', () => {
    const factory = riskScoreDocFactory({ now, identifierField, globalWeight: undefined });

    const result = factory(mockBucket, undefined, undefined);

    expect(result.notes).toEqual(['Test note']);
  });
});
