/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { rulesClientMock } from '@kbn/alerting-plugin/server/rules_client.mock';
import { actionsClientMock } from '@kbn/actions-plugin/server/mocks';
import { httpServerMock } from '@kbn/core-http-server-mocks';
import { loggerMock } from '@kbn/logging-mocks';
import type { AlertingApiRequestHandlerContext } from '@kbn/alerting-plugin/server';
import type { PluginStartContract as ActionsPluginStart } from '@kbn/actions-plugin/server';
import { AttackDiscoveryScheduleDataClient } from '@kbn/attack-discovery-schedules-common';
import { createScheduleDataClient } from '.';
import { ATTACK_DISCOVERY_SCHEDULE_TAG } from '../constants';

jest.mock('@kbn/attack-discovery-schedules-common', () => ({
  AttackDiscoveryScheduleDataClient: jest.fn(),
}));

describe('createScheduleDataClient', () => {
  const mockRulesClient = rulesClientMock.create();
  const mockActionsClient = actionsClientMock.create();
  const mockLogger = loggerMock.create();
  const mockRequest = httpServerMock.createKibanaRequest();

  const mockGetRulesClient = jest.fn().mockResolvedValue(mockRulesClient);
  const mockGetActionsClientWithRequest = jest.fn().mockResolvedValue(mockActionsClient);

  const mockAlertingContext = {
    getRulesClient: mockGetRulesClient,
  } as unknown as AlertingApiRequestHandlerContext;

  const mockStartPlugins = {
    actions: {
      getActionsClientWithRequest: mockGetActionsClientWithRequest,
    } as unknown as ActionsPluginStart,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('creates an AttackDiscoveryScheduleDataClient with applyTags set to the schedule tag', async () => {
    await createScheduleDataClient({
      alertingContext: mockAlertingContext,
      logger: mockLogger,
      request: mockRequest,
      startPlugins: mockStartPlugins,
    });

    expect(AttackDiscoveryScheduleDataClient).toHaveBeenCalledWith(
      expect.objectContaining({
        applyTags: [ATTACK_DISCOVERY_SCHEDULE_TAG],
      })
    );
  });

  it('creates an AttackDiscoveryScheduleDataClient with filterTags that only include the schedule tag', async () => {
    await createScheduleDataClient({
      alertingContext: mockAlertingContext,
      logger: mockLogger,
      request: mockRequest,
      startPlugins: mockStartPlugins,
    });

    expect(AttackDiscoveryScheduleDataClient).toHaveBeenCalledWith(
      expect.objectContaining({
        filterTags: { includeTags: [ATTACK_DISCOVERY_SCHEDULE_TAG] },
      })
    );
  });

  it('passes the rules client obtained from alertingContext', async () => {
    await createScheduleDataClient({
      alertingContext: mockAlertingContext,
      logger: mockLogger,
      request: mockRequest,
      startPlugins: mockStartPlugins,
    });

    expect(mockGetRulesClient).toHaveBeenCalled();
    expect(AttackDiscoveryScheduleDataClient).toHaveBeenCalledWith(
      expect.objectContaining({
        rulesClient: mockRulesClient,
      })
    );
  });

  it('passes the actions client obtained from startPlugins', async () => {
    await createScheduleDataClient({
      alertingContext: mockAlertingContext,
      logger: mockLogger,
      request: mockRequest,
      startPlugins: mockStartPlugins,
    });

    expect(mockGetActionsClientWithRequest).toHaveBeenCalledWith(mockRequest);
    expect(AttackDiscoveryScheduleDataClient).toHaveBeenCalledWith(
      expect.objectContaining({
        actionsClient: mockActionsClient,
      })
    );
  });

  it('passes the logger to the data client', async () => {
    await createScheduleDataClient({
      alertingContext: mockAlertingContext,
      logger: mockLogger,
      request: mockRequest,
      startPlugins: mockStartPlugins,
    });

    expect(AttackDiscoveryScheduleDataClient).toHaveBeenCalledWith(
      expect.objectContaining({
        logger: mockLogger,
      })
    );
  });
});
