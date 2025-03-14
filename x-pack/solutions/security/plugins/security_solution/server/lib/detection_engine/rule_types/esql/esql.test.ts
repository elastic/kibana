/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { KbnServerError } from '@kbn/kibana-utils-plugin/server';

import type { RuleExecutorServicesMock } from '@kbn/alerting-plugin/server/mocks';
import { alertsMock } from '@kbn/alerting-plugin/server/mocks';
import { licensingMock } from '@kbn/licensing-plugin/server/mocks';
import type { ExperimentalFeatures } from '../../../../../common';
import { getIndexVersion } from '../../routes/index/get_index_version';
import { SIGNALS_TEMPLATE_VERSION } from '../../routes/index/get_signals_template';
import { getEsqlRuleParams } from '../../rule_schema/mocks';
import { esqlExecutor } from './esql';
import { getDataTierFilter } from '../utils/get_data_tier_filter';
import { getSharedParamsMock } from '../__mocks__/shared_params';

jest.mock('../../routes/index/get_index_version');
jest.mock('../utils/get_data_tier_filter', () => ({ getDataTierFilter: jest.fn() }));

const getDataTierFilterMock = getDataTierFilter as jest.Mock;

describe('esqlExecutor', () => {
  let alertServices: RuleExecutorServicesMock;
  (getIndexVersion as jest.Mock).mockReturnValue(SIGNALS_TEMPLATE_VERSION);
  const params = getEsqlRuleParams();
  const mockExperimentalFeatures = {} as ExperimentalFeatures;
  const mockScheduleNotificationResponseActionsService = jest.fn();
  const licensing = licensingMock.createSetup();

  let mockedArguments: Parameters<typeof esqlExecutor>[0];

  const sharedParams = getSharedParamsMock({ ruleParams: params });

  beforeEach(() => {
    jest.clearAllMocks();
    alertServices = alertsMock.createRuleExecutorServices();
    getDataTierFilterMock.mockResolvedValue([]);

    mockedArguments = {
      sharedParams,
      services: alertServices,
      licensing,
      experimentalFeatures: mockExperimentalFeatures,
      scheduleNotificationResponseActionsService: mockScheduleNotificationResponseActionsService,
      state: {},
    };
  });

  describe('errors', () => {
    it('should return result with user error equal true when request fails with data verification exception', async () => {
      alertServices.scopedClusterClient.asCurrentUser.transport.request.mockRejectedValue(
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
      alertServices.scopedClusterClient.asCurrentUser.transport.request.mockRejectedValue(
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
});
