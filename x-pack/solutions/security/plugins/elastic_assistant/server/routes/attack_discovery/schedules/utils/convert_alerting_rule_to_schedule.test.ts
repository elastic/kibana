/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { OpenAiProviderType } from '@kbn/stack-connectors-plugin/common/openai/constants';

import { convertAlertingRuleToSchedule } from './convert_alerting_rule_to_schedule';
import { getInternalAttackDiscoveryScheduleMock } from '../../../../__mocks__/attack_discovery_schedules.mock';

const mockApiConfig = {
  connectorId: 'connector-id',
  actionTypeId: '.bedrock',
  model: 'model',
  provider: OpenAiProviderType.OpenAi,
};
const basicAttackDiscoveryScheduleMock = {
  name: 'Test Schedule',
  schedule: {
    interval: '10m',
  },
  params: {
    alertsIndexPattern: '.alerts-security.alerts-default',
    apiConfig: mockApiConfig,
    end: 'now',
    size: 25,
    start: 'now-24h',
  },
  enabled: true,
  actions: [],
};

describe('convertAlertingRuleToSchedule', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should convert basic internal schedule', async () => {
    const internalRule = getInternalAttackDiscoveryScheduleMock(basicAttackDiscoveryScheduleMock);
    const { id, createdBy, updatedBy, createdAt, updatedAt } = internalRule;
    const schedule = convertAlertingRuleToSchedule(internalRule);

    expect(schedule).toEqual({
      id,
      createdBy,
      updatedBy,
      createdAt: createdAt.toISOString(),
      updatedAt: updatedAt.toISOString(),
      ...basicAttackDiscoveryScheduleMock,
    });
  });

  it('should default to `elastic` as a user if `createdBy` and/or `updatedBy` set to null', async () => {
    const internalRule = getInternalAttackDiscoveryScheduleMock(basicAttackDiscoveryScheduleMock);
    const { createdBy: _, updatedBy: __, ...restInternalRule } = internalRule;
    const { id, createdAt, updatedAt } = internalRule;
    const schedule = convertAlertingRuleToSchedule({
      ...restInternalRule,
      createdBy: null,
      updatedBy: null,
    });

    expect(schedule).toEqual({
      id,
      createdBy: 'elastic',
      updatedBy: 'elastic',
      createdAt: createdAt.toISOString(),
      updatedAt: updatedAt.toISOString(),
      ...basicAttackDiscoveryScheduleMock,
    });
  });
});
