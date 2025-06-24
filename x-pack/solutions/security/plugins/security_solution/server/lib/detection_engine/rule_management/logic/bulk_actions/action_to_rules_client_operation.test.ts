/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ActionsClient } from '@kbn/actions-plugin/server';
import { BulkActionEditTypeEnum } from '../../../../../../common/api/detection_engine/rule_management';
import { bulkEditActionToRulesClientOperation } from './action_to_rules_client_operation';

describe('bulkEditActionToRulesClientOperation', () => {
  const actionsClient = {
    isSystemAction: jest.fn((id: string) => id === 'system-connector-.cases'),
  } as unknown as jest.Mocked<ActionsClient>;
  test('should transform tags bulk edit actions correctly', () => {
    expect(
      bulkEditActionToRulesClientOperation(actionsClient, {
        type: BulkActionEditTypeEnum.add_tags,
        value: ['test'],
      })
    ).toEqual([
      {
        field: 'tags',
        operation: 'add',
        value: ['test'],
      },
    ]);
  });

  expect(
    bulkEditActionToRulesClientOperation(actionsClient, {
      type: BulkActionEditTypeEnum.set_tags,
      value: ['test'],
    })
  ).toEqual([
    {
      field: 'tags',
      operation: 'set',
      value: ['test'],
    },
  ]);

  expect(
    bulkEditActionToRulesClientOperation(actionsClient, {
      type: BulkActionEditTypeEnum.delete_tags,
      value: ['test'],
    })
  ).toEqual([
    {
      field: 'tags',
      operation: 'delete',
      value: ['test'],
    },
  ]);

  test('should transform schedule bulk edit correctly', () => {
    expect(
      bulkEditActionToRulesClientOperation(actionsClient, {
        type: BulkActionEditTypeEnum.set_schedule,
        value: {
          interval: '100m',
          lookback: '10m',
        },
      })
    ).toEqual([
      {
        field: 'schedule',
        operation: 'set',
        value: { interval: '100m' },
      },
    ]);
  });

  test('should add_rule_actions non-system actions', () => {
    expect(
      bulkEditActionToRulesClientOperation(actionsClient, {
        type: BulkActionEditTypeEnum.add_rule_actions,
        value: {
          actions: [
            {
              group: 'default',
              id: 'b0d183b2-3e04-428d-9fc4-ca7e23604380',
              params: {
                message: 'Rule {{context.rule.name}} generated {{state.signals_count}} alerts',
              },
              frequency: { summary: true, notifyWhen: 'onActiveAlert', throttle: null },
            },
          ],
        },
      })
    ).toEqual([
      {
        field: 'actions',
        operation: 'add',
        value: [
          {
            group: 'default',
            id: 'b0d183b2-3e04-428d-9fc4-ca7e23604380',
            params: {
              message: 'Rule {{context.rule.name}} generated {{state.signals_count}} alerts',
            },
            frequency: { summary: true, notifyWhen: 'onActiveAlert', throttle: null },
          },
        ],
      },
    ]);
  });

  test('should add_rule_actions system actions', () => {
    expect(
      bulkEditActionToRulesClientOperation(actionsClient, {
        type: BulkActionEditTypeEnum.add_rule_actions,
        value: {
          actions: [
            {
              id: 'system-connector-.cases',
              params: {
                subAction: 'run',
                subActionParams: {
                  timeWindow: '7d',
                  reopenClosedCases: false,
                  groupingBy: ['agent.name'],
                },
              },
            },
          ],
        },
      })
    ).toEqual([
      {
        field: 'actions',
        operation: 'add',
        value: [
          {
            id: 'system-connector-.cases',
            params: {
              subAction: 'run',
              subActionParams: {
                timeWindow: '7d',
                reopenClosedCases: false,
                groupingBy: ['agent.name'],
              },
            },
          },
        ],
      },
    ]);
  });

  test('should set_rule_actions non-system actions', () => {
    expect(
      bulkEditActionToRulesClientOperation(actionsClient, {
        type: BulkActionEditTypeEnum.set_rule_actions,
        value: {
          actions: [
            {
              group: 'default',
              id: 'b0d183b2-3e04-428d-9fc4-ca7e23604380',
              params: {
                message:
                  'How many alerts were generated? This many alerts: {{state.signals_count}}',
              },
              frequency: { summary: true, notifyWhen: 'onActiveAlert', throttle: null },
            },
          ],
        },
      })
    ).toEqual([
      {
        field: 'actions',
        operation: 'set',
        value: [
          {
            id: 'b0d183b2-3e04-428d-9fc4-ca7e23604380',
            params: {
              message: 'How many alerts were generated? This many alerts: {{state.signals_count}}',
            },
            frequency: { summary: true, notifyWhen: 'onActiveAlert', throttle: null },
            group: 'default',
          },
        ],
      },
    ]);
  });

  test('should set_rule_actions system actions', () => {
    expect(
      bulkEditActionToRulesClientOperation(actionsClient, {
        type: BulkActionEditTypeEnum.set_rule_actions,
        value: {
          actions: [
            {
              id: 'system-connector-.cases',
              params: {
                subAction: 'run',
                subActionParams: {
                  timeWindow: '7d',
                  reopenClosedCases: false,
                  groupingBy: ['agent.type'],
                },
              },
            },
          ],
        },
      })
    ).toEqual([
      {
        field: 'actions',
        operation: 'set',
        value: [
          {
            id: 'system-connector-.cases',
            params: {
              subAction: 'run',
              subActionParams: {
                timeWindow: '7d',
                reopenClosedCases: false,
                groupingBy: ['agent.type'],
              },
            },
          },
        ],
      },
    ]);
  });
});
