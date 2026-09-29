/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';
import type { Mock } from 'vitest';

import { getExceptionListItemSchemaMock } from '@kbn/lists-plugin/common/schemas/response/exception_list_item_schema.mock';
import type { ExperimentalFeatures } from '../../../../../common';
import { getIndexVersion } from '../../routes/index/get_index_version';
import { SIGNALS_TEMPLATE_VERSION } from '../../routes/index/get_signals_template';
import { getEqlRuleParams } from '../../rule_schema/mocks';
import { eqlExecutor } from './eql';
import { getDataTierFilter } from '../utils/get_data_tier_filter';
import { getSharedParamsMock } from '../__mocks__/shared_params';
import type { PersistenceExecutorOptionsMock } from '@kbn/rule-registry-plugin/server/utils/create_persistence_rule_type_wrapper.mock';
import { createPersistenceExecutorOptionsMock } from '@kbn/rule-registry-plugin/server/utils/create_persistence_rule_type_wrapper.mock';

vi.mock('../../routes/index/get_index_version');
vi.mock('../utils/get_data_tier_filter', () => {
      const mocked = { getDataTierFilter: vi.fn() };
      return { ...mocked, default: mocked };
    });

const getDataTierFilterMock = getDataTierFilter as Mock;

describe('eql_executor', () => {
  let ruleServices: PersistenceExecutorOptionsMock;
  (getIndexVersion as Mock).mockReturnValue(SIGNALS_TEMPLATE_VERSION);
  const params = getEqlRuleParams();
  const mockExperimentalFeatures = {} as ExperimentalFeatures;
  const mockScheduleNotificationResponseActionsService = vi.fn();

  const sharedParams = getSharedParamsMock({ ruleParams: params });

  beforeEach(() => {
    vi.clearAllMocks();
    ruleServices = createPersistenceExecutorOptionsMock();
    ruleServices.scopedClusterClient.asCurrentUser.eql.search.mockResolvedValue({
      hits: {
        total: { relation: 'eq', value: 10 },
        events: [],
      },
    });
    getDataTierFilterMock.mockResolvedValue([]);
  });

  describe('eqlExecutor', () => {
    describe('warning scenarios', () => {
      it('warns when exception list for eql rule contains value list exceptions', async () => {
        const { result } = await eqlExecutor({
          sharedParams: getSharedParamsMock({
            ruleParams: params,
            rewrites: { unprocessedExceptions: [getExceptionListItemSchemaMock()] },
          }),
          services: ruleServices,
          wrapSuppressedHits: vi.fn(),
          isAlertSuppressionActive: false,
          experimentalFeatures: mockExperimentalFeatures,
          scheduleNotificationResponseActionsService:
            mockScheduleNotificationResponseActionsService,
        });
        expect(result.warningMessages).toEqual([
          `The following exceptions won't be applied to rule execution: ${
            getExceptionListItemSchemaMock().name
          }`,
        ]);
      });
    });

    it('should classify EQL verification exceptions as "user errors" when reporting to the framework', async () => {
      ruleServices.scopedClusterClient.asCurrentUser.eql.search.mockRejectedValue(
        new Error(
          'verification_exception\n\tRoot causes:\n\t\tverification_exception: Found 1 problem\nline 1:1: Unknown column [event.category]'
        )
      );
      const { result } = await eqlExecutor({
        sharedParams,
        services: ruleServices,
        wrapSuppressedHits: vi.fn(),
        isAlertSuppressionActive: true,
        experimentalFeatures: mockExperimentalFeatures,
        scheduleNotificationResponseActionsService: mockScheduleNotificationResponseActionsService,
      });
      expect(result.userError).toEqual(true);
    });

    it('should handle scheduleNotificationResponseActionsService call', async () => {
      const { result } = await eqlExecutor({
        sharedParams,
        services: ruleServices,
        wrapSuppressedHits: vi.fn(),
        isAlertSuppressionActive: false,
        experimentalFeatures: mockExperimentalFeatures,
        scheduleNotificationResponseActionsService: mockScheduleNotificationResponseActionsService,
      });
      expect(mockScheduleNotificationResponseActionsService).toHaveBeenCalledWith({
        signals: result.createdSignals,
        signalsCount: result.createdSignalsCount,
        responseActions: params.responseActions,
      });
    });

    it('should pass frozen tier filters in eql search request', async () => {
      getDataTierFilterMock.mockResolvedValue([
        {
          meta: { negate: true },
          query: {
            terms: {
              _tier: ['data_cold'],
            },
          },
        },
      ]);

      await eqlExecutor({
        sharedParams,
        services: ruleServices,
        wrapSuppressedHits: vi.fn(),
        isAlertSuppressionActive: true,
        experimentalFeatures: mockExperimentalFeatures,
        scheduleNotificationResponseActionsService: mockScheduleNotificationResponseActionsService,
      });

      const searchArgs = ruleServices.scopedClusterClient.asCurrentUser.eql.search.mock.calls[0][0];

      expect(searchArgs).toHaveProperty(
        'filter.bool.filter',
        expect.arrayContaining([
          {
            bool: {
              filter: [],
              must: [],
              must_not: [{ terms: { _tier: ['data_cold'] } }],
              should: [],
            },
          },
        ])
      );
    });
  });
});
