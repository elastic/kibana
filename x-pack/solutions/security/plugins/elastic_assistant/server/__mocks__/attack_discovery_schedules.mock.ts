/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  AttackDiscoverySchedule,
  AttackDiscoveryScheduleAction,
  AttackDiscoveryScheduleCreateProps,
  AttackDiscoveryScheduleParams,
  AttackDiscoveryScheduleUpdateProps,
} from '@kbn/elastic-assistant-common';

import { SanitizedRule, SanitizedRuleAction } from '@kbn/alerting-types';

export const getAttackDiscoveryCreateScheduleMock = (
  enabled = true
): AttackDiscoveryScheduleCreateProps => {
  return {
    name: 'Test Schedule 1',
    schedule: {
      interval: '10m',
    },
    params: {
      alertsIndexPattern: '.alerts-security.alerts-default',
      apiConfig: {
        name: 'Mock GPT-4o',
        connectorId: 'gpt-4o',
        actionTypeId: '.gen-ai',
      },
      end: 'now',
      size: 100,
      start: 'now-24h',
    },
    enabled,
  };
};

export const getAttackDiscoveryUpdateScheduleMock = (
  id: string,
  overrides: Partial<AttackDiscoveryScheduleUpdateProps>
): AttackDiscoveryScheduleUpdateProps & { id: string } => {
  return {
    id,
    actions: [],
    ...getAttackDiscoveryCreateScheduleMock(),
    ...overrides,
  };
};

export const getInternalAttackDiscoveryScheduleMock = (
  createParams: AttackDiscoveryScheduleCreateProps,
  overrides?: Partial<SanitizedRule<AttackDiscoveryScheduleParams>>
): SanitizedRule<AttackDiscoveryScheduleParams> => {
  const { actions = [], params, ...restAttributes } = createParams;
  return {
    id: '54fc45a4-9d1e-4228-8fec-dbf91ea15171',
    enabled: false,
    tags: [],
    alertTypeId: 'attack-discovery',
    consumer: 'siem',
    actions: (actions as SanitizedRuleAction[]) ?? [],
    systemActions: [],
    params,
    createdBy: 'elastic',
    updatedBy: 'elastic',
    createdAt: new Date('2025-03-31T17:38:03.544Z'),
    updatedAt: new Date('2025-03-31T17:38:03.544Z'),
    apiKeyOwner: null,
    apiKeyCreatedByUser: null,
    throttle: null,
    muteAll: false,
    notifyWhen: null,
    mutedInstanceIds: [],
    executionStatus: {
      status: 'pending',
      lastExecutionDate: new Date('2025-03-31T17:38:03.544Z'),
    },
    revision: 0,
    running: false,
    ...restAttributes,
    ...overrides,
  };
};

export const getAttackDiscoveryScheduleMock = (
  overrides?: Partial<AttackDiscoverySchedule>
): AttackDiscoverySchedule => {
  return {
    id: '31db8de1-65f2-4da2-a3e6-d15d9931817e',
    name: 'Test Schedule',
    createdBy: 'elastic',
    updatedBy: 'elastic',
    createdAt: '2025-03-31T09:57:42.194Z',
    updatedAt: '2025-03-31T09:57:42.194Z',
    enabled: false,
    params: {
      alertsIndexPattern: '.alerts-security.alerts-default',
      apiConfig: {
        name: 'Mock GPT-4o',
        connectorId: 'gpt-4o',
        actionTypeId: '.gen-ai',
      },
      end: 'now',
      size: 100,
      start: 'now-24h',
    },
    schedule: {
      interval: '10m',
    },
    actions: [],
    ...overrides,
  };
};

export const getFindAttackDiscoverySchedulesMock = (schedules: AttackDiscoverySchedule[]) => {
  return {
    total: schedules.length,
    data: schedules,
  };
};

export const getScheduleActions = (): AttackDiscoveryScheduleAction[] => {
  return [
    {
      id: 'ab81485e-3685-4215-9804-7693d0271d1b',
      actionTypeId: '.email',
      group: 'default',
      params: {
        message: 'Rule {{context.rule.name}} generated {{state.signals_count}} alerts',
        to: ['test2@elastic.co'],
        subject: 'Hello there',
      },
      frequency: {
        summary: true,
        notifyWhen: 'onActiveAlert',
        throttle: null,
      },
    },
    {
      id: 'a6c9e92a-b701-41f3-9e26-aca7563e6908',
      actionTypeId: '.slack',
      group: 'default',
      params: {
        message: 'Rule {{context.rule.name}} generated {{state.signals_count}} alerts',
      },
      frequency: {
        summary: true,
        notifyWhen: 'onActiveAlert',
        throttle: null,
      },
    },
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
  ];
};
