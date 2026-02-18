/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggingSystemMock } from '@kbn/core-logging-server-mocks';
import { mockCreateAttackDiscoveryAlertsParams } from '../../../__mocks__/mock_create_attack_discovery_alerts_params';
import { attackDiscoveryDataGeneratorExecutor } from './executor';

describe('attackDiscoveryDataGeneratorExecutor', () => {
  const logger = loggingSystemMock.createLogger();

  const createOptions = () => {
    const alertsClient = {
      report: jest.fn(() => ({ uuid: 'alert-uuid-1', start: null })),
      setAlertData: jest.fn(),
    };

    return {
      alertsClient,
      options: {
        params: mockCreateAttackDiscoveryAlertsParams,
        rule: { id: 'rule-1' },
        services: { alertsClient },
        spaceId: 'default',
      } as unknown as Parameters<typeof attackDiscoveryDataGeneratorExecutor>[0]['options'],
    };
  };

  it('reports each discovery as an alert', async () => {
    const { alertsClient, options } = createOptions();

    await attackDiscoveryDataGeneratorExecutor({
      options,
      logger,
      publicBaseUrl: 'http://localhost:5601',
    });

    expect(alertsClient.report).toHaveBeenCalledTimes(
      mockCreateAttackDiscoveryAlertsParams.attackDiscoveries.length
    );
  });

  it('sets alert data for each discovery', async () => {
    const { alertsClient, options } = createOptions();

    await attackDiscoveryDataGeneratorExecutor({
      options,
      logger,
      publicBaseUrl: 'http://localhost:5601',
    });

    expect(alertsClient.setAlertData).toHaveBeenCalledTimes(
      mockCreateAttackDiscoveryAlertsParams.attackDiscoveries.length
    );
  });
});
