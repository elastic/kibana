/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AttackDiscoveryScheduleCreateProps } from '@kbn/elastic-assistant-common';

export const getSimpleAttackDiscoverySchedule = (
  overrides?: Partial<AttackDiscoveryScheduleCreateProps>
): AttackDiscoveryScheduleCreateProps => {
  return {
    name: 'Simple Schedule 1',
    enabled: false,
    params: {
      alertsIndexPattern: '.alerts-security.alerts-default',
      apiConfig: {
        connectorId: 'preconfigured-bedrock',
        actionTypeId: '.bedrock',
        name: 'preconfigured-bedrock',
      },
      end: 'now',
      size: 50,
      start: 'now-24h',
    },
    schedule: {
      interval: '24h',
    },
    actions: [],
    ...overrides,
  };
};
