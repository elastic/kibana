/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CreateRuleData } from '@kbn/alerting-plugin/server/application/rule/methods/create';
import { UpdateRuleData } from '@kbn/alerting-plugin/server/application/rule/methods/update';
import {
  ATTACK_DISCOVERY_SCHEDULES_ALERT_TYPE_ID,
  AttackDiscoverySchedule,
  AttackDiscoveryScheduleCreateProps,
  AttackDiscoveryScheduleParams,
} from '@kbn/elastic-assistant-common';

import { SanitizedRule, SanitizedRuleAction } from '@kbn/alerting-types';

export const getAttackDiscoveryCreateScheduleMock = (
  enabled = true
): CreateRuleData<AttackDiscoveryScheduleParams> => {
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
    actions: [],
    alertTypeId: ATTACK_DISCOVERY_SCHEDULES_ALERT_TYPE_ID,
    consumer: 'siem',
    enabled,
    tags: [],
  };
};

export const getAttackDiscoveryUpdateScheduleMock = (
  id: string,
  overrides: Partial<CreateRuleData<AttackDiscoveryScheduleParams>>
): UpdateRuleData<AttackDiscoveryScheduleParams> & { id: string } => {
  return {
    id,
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

export const getInternalFindAttackDiscoverySchedulesMock = (
  schedules: Array<SanitizedRule<AttackDiscoveryScheduleParams>>
) => {
  return {
    page: 1,
    perPage: 20,
    total: schedules.length,
    data: schedules,
  };
};
