/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { KbnServerError } from '@kbn/kibana-utils-plugin/server';
import moment from 'moment';

import { licensingMock } from '@kbn/licensing-plugin/server/mocks';
import { getIndexVersion } from '../../routes/index/get_index_version';
import { SIGNALS_TEMPLATE_VERSION } from '../../routes/index/get_signals_template';
import { getEsqlRuleParams } from '../../rule_schema/mocks';
import { esqlExecutor } from './esql';
import { getDataTierFilter } from '../utils/get_data_tier_filter';
import { getSharedParamsMock } from '../__mocks__/shared_params';
import type { PersistenceExecutorOptionsMock } from '@kbn/rule-registry-plugin/server/utils/create_persistence_rule_type_wrapper.mock';
import { createPersistenceExecutorOptionsMock } from '@kbn/rule-registry-plugin/server/utils/create_persistence_rule_type_wrapper.mock';
import { getMvExpandFields } from '@kbn/securitysolution-utils';

jest.mock('../../routes/index/get_index_version');
jest.mock('../utils/get_data_tier_filter', () => ({ getDataTierFilter: jest.fn() }));
jest.mock('@kbn/securitysolution-utils', () => ({
  ...jest.requireActual('@kbn/securitysolution-utils'),
  getMvExpandFields: jest.fn().mockReturnValue([]),
}));

const getDataTierFilterMock = getDataTierFilter as jest.Mock;

describe('esqlExecutor', () => {
  let ruleServices: PersistenceExecutorOptionsMock;
  (getIndexVersion as jest.Mock).mockReturnValue(SIGNALS_TEMPLATE_VERSION);
  const params = getEsqlRuleParams();
  const mockScheduleNotificationResponseActionsService = jest.fn();
  const licensing = licensingMock.createSetup();

  let mockedArguments: Parameters<typeof esqlExecutor>[0];

  const sharedParams = getSharedParamsMock({ ruleParams: params });

  beforeEach(() => {
    jest.clearAllMocks();
    ruleServices = createPersistenceExecutorOptionsMock();
    getDataTierFilterMock.mockResolvedValue([]);

    mockedArguments = {
      sharedParams,
      services: ruleServices,
      licensing,
      scheduleNotificationResponseActionsService: mockScheduleNotificationResponseActionsService,
      state: {},
    };
  });

  describe('errors', () => {
    it('should return result with user error equal true when request fails with data verification exception', async () => {
      ruleServices.scopedClusterClient.asCurrentUser.transport.request.mockRejectedValue(
        new KbnServerError(
          'verification_exception: Found 1 problem\nline 1:45: invalid [test_not_lookup] resolution in lookup mode to an index in [standard] mode',
          400,
          {
            error: {
              root_cause: [
                {
                  type: 'verification_exception',
                  reason:
                    'Found 1 problem\nline 1:45: invalid [test_not_lookup] resolution in lookup mode to an index in [standard] mode',
                },
              ],
              type: 'verification_exception',
              reason:
                'Found 1 problem\nline 1:45: invalid [test_not_lookup] resolution in lookup mode to an index in [standard] mode',
            },
          }
        )
      );

      const result = await esqlExecutor(mockedArguments);

      expect(result).toHaveProperty('userError', true);
      expect(result).toHaveProperty('errors', [
        'verification_exception: Found 1 problem\nline 1:45: invalid [test_not_lookup] resolution in lookup mode to an index in [standard] mode',
      ]);
    });

    it('should return result without user error when request fails with non-categorized error', async () => {
      ruleServices.scopedClusterClient.asCurrentUser.transport.request.mockRejectedValue(
        new KbnServerError('Unknown Error', 500, {
          error: {
            root_cause: [
              {
                type: 'unknown',
                reason: 'Unknown Error',
              },
            ],
            type: 'unknown',
            reason: 'Unknown Error',
          },
        })
      );

      const result = await esqlExecutor(mockedArguments);

      expect(result).not.toHaveProperty('userError');
      expect(result).toHaveProperty('errors', ['Unknown Error']);
    });
  });

  describe('rule state', () => {
    it('should add a warning message when excluded documents exceed 100,000', async () => {
      mockedArguments.state = {
        excludedDocuments: Array.from({ length: 100001 }, (_, i) => ({
          id: `doc${i + 1}`,
          timestamp: `2025-04-28T10:00:00Z`,
        })),
      };
      mockedArguments.sharedParams.tuple = {
        from: moment('2025-04-28T09:00:00Z'),
        to: moment('2025-04-28T12:00:00Z'),
        maxSignals: 100,
      };

      const result = await esqlExecutor(mockedArguments);

      expect(result.warningMessages).toContain(
        'Excluded documents exceeded the limit of 100000, some alerts might not have been created. Consider reducing the lookback time for the rule.'
      );
      expect(
        ruleServices.scopedClusterClient.asCurrentUser.transport.request
      ).not.toHaveBeenCalled();
    });

    it('should include documents ids from state in ES|QL request', async () => {
      mockedArguments.state = {
        excludedDocuments: [
          { id: 'doc1', timestamp: '2025-04-28T10:00:00Z' },
          { id: 'doc2', timestamp: '2025-04-28T11:00:00Z' },
        ],
      };
      mockedArguments.sharedParams.tuple = {
        from: moment('2025-04-28T09:00:00Z'),
        to: moment('2025-04-28T12:00:00Z'),
        maxSignals: 100,
      };

      await esqlExecutor(mockedArguments);
      const transportRequestArgs =
        ruleServices.scopedClusterClient.asCurrentUser.transport.request.mock.calls[0][0];

      expect(transportRequestArgs).toHaveProperty('body.filter.bool.must_not.ids.values', [
        'doc1',
        'doc2',
      ]);
    });

    it('should include documents ids from state in ES|QL request when query has mv_expand', async () => {
      mockedArguments.state = {
        excludedDocuments: [
          { id: 'doc1', timestamp: '2025-04-28T10:00:00Z' },
          { id: 'doc2', timestamp: '2025-04-28T11:00:00Z' },
        ],
      };
      (getMvExpandFields as jest.Mock).mockReturnValue(['agent.name']);
      mockedArguments.sharedParams.tuple = {
        from: moment('2025-04-28T09:00:00Z'),
        to: moment('2025-04-28T12:00:00Z'),
        maxSignals: 100,
      };

      await esqlExecutor(mockedArguments);
      const transportRequestArgs =
        ruleServices.scopedClusterClient.asCurrentUser.transport.request.mock.calls[0][0];

      expect(transportRequestArgs).not.toHaveProperty('body.filter.bool.must_not.ids.values');
    });
  });
});
