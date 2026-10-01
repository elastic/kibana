/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AttackDiscoverySchedule } from '@kbn/elastic-assistant-common';

export const getScheduleMock = (
  overrides?: Partial<AttackDiscoverySchedule>
): AttackDiscoverySchedule => ({
  actions: [],
  createdAt: '2025-03-31T09:57:42.194Z',
  createdBy: 'elastic',
  enabled: false,
  id: '31db8de1-65f2-4da2-a3e6-d15d9931817e',
  name: 'Test Schedule',
  params: {
    alertsIndexPattern: '.alerts-security.alerts-default',
    apiConfig: {
      actionTypeId: '.gen-ai',
      connectorId: 'gpt-4o',
      name: 'Mock GPT-4o',
    },
    end: 'now',
    size: 100,
    start: 'now-24h',
  },
  schedule: {
    interval: '10m',
  },
  updatedAt: '2025-03-31T09:57:42.194Z',
  updatedBy: 'elastic',
  ...overrides,
});
