/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  AlertsClient,
  ConstructorOptions,
} from '@kbn/rule-registry-plugin/server/alert_data_client/alerts_client';
import { elasticsearchServiceMock } from '@kbn/core/server/mocks';
import { loggingSystemMock } from '@kbn/core/server/mocks';
import { alertingAuthorizationMock } from '@kbn/alerting-plugin/server/authorization/alerting_authorization.mock';
import { auditLoggerMock } from '@kbn/security-plugin/server/audit/mocks';
import { ruleDataServiceMock } from '@kbn/rule-registry-plugin/server/rule_data_plugin_service/rule_data_plugin_service.mock';
import type { ElasticsearchClient } from '@kbn/core/server';
import {
  ALERT_RULE_CONSUMER,
  ALERT_RULE_TYPE_ID,
  SPACE_IDS,
  ALERT_WORKFLOW_STATUS,
} from '@kbn/rule-data-utils';
import { mockAlerts } from '../../common/mocks/constants/session_view_process.mock';

const getResponse = async () => {
  return {
    hits: {
      total: mockAlerts.length,
      hits: mockAlerts.map((event) => {
        return {
          found: true,
          _type: 'alert',
          _index: '.alerts-security',
          _id: 'NoxgpHkBqbdrfX07MqXV',
          _version: 1,
          _seq_no: 362,
          _primary_term: 2,
          _source: {
            [ALERT_RULE_TYPE_ID]: 'apm.error_rate',
            message: 'hello world 1',
            [ALERT_RULE_CONSUMER]: 'apm',
            [ALERT_WORKFLOW_STATUS]: 'open',
            [SPACE_IDS]: ['test_default_space_id'],
            ...event,
          },
        };
      }),
    },
  };
};

const createAlertsClientParams = () => {
  const getAlertIndicesAliasMock = jest.fn();
  const alertingAuthMock = alertingAuthorizationMock.create();

  const authorizedRuleTypes = new Map([
    [
      'apm.error_rate',
      {
        producer: 'apm',
        id: 'apm.error_rate',
        alerts: {
          context: 'observability.apm',
        },
        authorizedConsumers: {},
      },
    ],
  ]);

  alertingAuthMock.getSpaceId.mockImplementation(() => 'test_default_space_id');
  alertingAuthMock.getAllAuthorizedRuleTypes.mockResolvedValue({
    hasAllRequested: true,
    authorizedRuleTypes,
  });

  alertingAuthMock.getAllAuthorizedRuleTypesFindOperation.mockResolvedValue(authorizedRuleTypes);
  getAlertIndicesAliasMock.mockReturnValue(['.alerts-observability.apm-default']);

  alertingAuthMock.ensureAuthorized.mockImplementation(async ({ ruleTypeId, consumer }) => {
    if (ruleTypeId === 'apm.error_rate' && consumer === 'apm') {
      return Promise.resolve();
    }
    return Promise.reject(new Error(`Unauthorized for ${ruleTypeId} and ${consumer}`));
  });

  const auditLogger = auditLoggerMock.create();
  const esClientMock = elasticsearchServiceMock.createElasticsearchClient(getResponse());
  const alertsClientParams: jest.Mocked<ConstructorOptions> = {
    logger: loggingSystemMock.create().get(),
    authorization: alertingAuthMock,
    auditLogger,
    ruleDataService: ruleDataServiceMock.create(),
    esClient: esClientMock,
    getRuleType: jest.fn(),
    getRuleList: jest.fn(),
    getAlertIndicesAlias: getAlertIndicesAliasMock,
  };

  return alertsClientParams;
};

export function getAlertsClientMockInstance(esClient?: ElasticsearchClient) {
  esClient = esClient || elasticsearchServiceMock.createElasticsearchClient(getResponse());

  const alertsClient = new AlertsClient({ ...createAlertsClientParams(), esClient });

  return alertsClient;
}

// this is only here because the above imports complain if they aren't declared as part of a test file.
describe('alerts_route_mock.test.ts', () => {
  it('does nothing', () => undefined);
});
