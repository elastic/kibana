/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import dateMath from '@kbn/datemath';
import { KbnServerError } from '@kbn/kibana-utils-plugin/server';

import type { RuleExecutorServicesMock } from '@kbn/alerting-plugin/server/mocks';
import { alertsMock } from '@kbn/alerting-plugin/server/mocks';
import { getExceptionListItemSchemaMock } from '@kbn/lists-plugin/common/schemas/response/exception_list_item_schema.mock';
import type { ExperimentalFeatures } from '../../../../../common';
import { getIndexVersion } from '../../routes/index/get_index_version';
import { SIGNALS_TEMPLATE_VERSION } from '../../routes/index/get_signals_template';
import type { EsqlRuleParams } from '../../rule_schema';
import { getCompleteRuleMock, getEsqlRuleParams } from '../../rule_schema/mocks';
import { ruleExecutionLogMock } from '../../rule_monitoring/mocks';
import { esqlExecutor } from './esql';
import { getDataTierFilter } from '../utils/get_data_tier_filter';

jest.mock('../../routes/index/get_index_version');
jest.mock('../utils/get_data_tier_filter', () => ({ getDataTierFilter: jest.fn() }));

const getDataTierFilterMock = getDataTierFilter as jest.Mock;

describe('esqlExecutor', () => {
  const version = '9.1.0';
  const ruleExecutionLogger = ruleExecutionLogMock.forExecutors.create();
  let alertServices: RuleExecutorServicesMock;
  (getIndexVersion as jest.Mock).mockReturnValue(SIGNALS_TEMPLATE_VERSION);
  const params = getEsqlRuleParams();
  const esqlCompleteRule = getCompleteRuleMock<EsqlRuleParams>(params);
  const tuple = {
    from: dateMath.parse(params.from)!,
    to: dateMath.parse(params.to)!,
    maxSignals: params.maxSignals,
  };
  const mockExperimentalFeatures = {} as ExperimentalFeatures;
  const mockScheduleNotificationResponseActionsService = jest.fn();
  const SPACE_ID = 'space';
  const PUBLIC_BASE_URL = 'http://testkibanabaseurl.com';

  let mockedArguments: Parameters<typeof esqlExecutor>[0];

  beforeEach(() => {
    jest.clearAllMocks();
    alertServices = alertsMock.createRuleExecutorServices();
    getDataTierFilterMock.mockResolvedValue([]);

    mockedArguments = {
      runOpts: {
        completeRule: esqlCompleteRule,
        tuple,
        ruleExecutionLogger,
        bulkCreate: jest.fn(),
        mergeStrategy: 'allFields',
        primaryTimestamp: '@timestamp',
        alertWithSuppression: jest.fn(),
        unprocessedExceptions: [getExceptionListItemSchemaMock()],
        publicBaseUrl: PUBLIC_BASE_URL,
      },
      services: alertServices,
      version,
      licensing: {},
      spaceId: SPACE_ID,
      experimentalFeatures: mockExperimentalFeatures,
      scheduleNotificationResponseActionsService: mockScheduleNotificationResponseActionsService,
    } as unknown as Parameters<typeof esqlExecutor>[0];
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
