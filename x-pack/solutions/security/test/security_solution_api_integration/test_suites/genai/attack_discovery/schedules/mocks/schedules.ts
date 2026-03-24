/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AttackDiscoveryApiScheduleCreateProps } from '@kbn/elastic-assistant-common';

export const getSimpleAttackDiscoverySchedule = (
  overrides?: Partial<AttackDiscoveryApiScheduleCreateProps>
): AttackDiscoveryApiScheduleCreateProps => {
  return {
    name: 'Simple Schedule 1',
    enabled: false,
    params: {
      alerts_index_pattern: '.alerts-security.alerts-default',
      api_config: {
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
