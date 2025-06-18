/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { actionsClientMock } from '@kbn/actions-plugin/server/mocks';
import { loggerMock } from '@kbn/logging-mocks';

import { convertScheduleActionsToAlertingActions } from './transform_actions';
import { getScheduleActions } from '../../../../../__mocks__/attack_discovery_schedules.mock';

const mockActionsClient = actionsClientMock.create();
const mockLogger = loggerMock.create();

describe('convertScheduleActionsToAlertingActions', () => {
  const systemAction = getScheduleActions().find((action) => action.actionTypeId === '.cases');

  beforeEach(() => {
    jest.clearAllMocks();

    (mockActionsClient.isSystemAction as jest.Mock).mockImplementation((connectorId: string) => {
      return connectorId === systemAction?.id;
    });
  });

  it('should convert basic internal schedule', async () => {
    const scheduleActions = getScheduleActions();
    const { actions, systemActions } = convertScheduleActionsToAlertingActions({
      actionsClient: mockActionsClient,
      logger: mockLogger,
      scheduleActions,
    });

    expect(actions).toEqual([
      {
        actionTypeId: '.email',
        frequency: { notifyWhen: 'onActiveAlert', summary: true, throttle: null },
        group: 'default',
        id: 'ab81485e-3685-4215-9804-7693d0271d1b',
        params: {
          message: 'Rule {{context.rule.name}} generated {{state.signals_count}} alerts',
          subject: 'Hello there',
          to: ['test2@elastic.co'],
        },
      },
      {
        actionTypeId: '.slack',
        frequency: { notifyWhen: 'onActiveAlert', summary: true, throttle: null },
        group: 'default',
        id: 'a6c9e92a-b701-41f3-9e26-aca7563e6908',
        params: { message: 'Rule {{context.rule.name}} generated {{state.signals_count}} alerts' },
      },
    ]);
    expect(systemActions).toEqual([
      {
        id: '74ad56aa-cc3d-45a4-a944-654b625ed054',
        actionTypeId: '.cases',
        params: {
          subAction: 'run',
          subActionParams: {
            timeWindow: '5m',
            reopenClosedCases: false,
            groupingBy: ['kibana.alert.attack_discovery.alert_ids'],
            templateId: null,
          },
        },
      },
    ]);
  });

  it('should log an error when there is a non system action with undefined group', async () => {
    const scheduleActions = getScheduleActions().map(({ group, ...restOfAction }) => {
      return restOfAction;
    });

    const { actions, systemActions } = convertScheduleActionsToAlertingActions({
      actionsClient: mockActionsClient,
      logger: mockLogger,
      scheduleActions,
    });

    expect(mockLogger.error).toHaveBeenCalledTimes(2);
    expect(mockLogger.error).toHaveBeenNthCalledWith(
      1,
      'Missing group for non-system action ab81485e-3685-4215-9804-7693d0271d1b of type .email'
    );
    expect(mockLogger.error).toHaveBeenNthCalledWith(
      2,
      'Missing group for non-system action a6c9e92a-b701-41f3-9e26-aca7563e6908 of type .slack'
    );

    expect(actions).toEqual([]);
    expect(systemActions).toEqual([
      {
        id: '74ad56aa-cc3d-45a4-a944-654b625ed054',
        actionTypeId: '.cases',
        params: {
          subAction: 'run',
          subActionParams: {
            timeWindow: '5m',
            reopenClosedCases: false,
            groupingBy: ['kibana.alert.attack_discovery.alert_ids'],
            templateId: null,
          },
        },
      },
    ]);
  });
});
