/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AttackDiscoverySchedule } from '@kbn/elastic-assistant-common';

export const mockFindAttackDiscoverySchedules: {
  schedules: AttackDiscoverySchedule[];
  total: number;
} = {
  total: 2,
  schedules: [
    {
      id: 'ffaa0a8a-3c35-4166-9f73-70baac2b6b42',
      name: 'Schedule - Sonnet 3.7 (Bedrock)',
      createdBy: 'elastic',
      updatedBy: 'elastic',
      createdAt: '2025-04-09T08:51:04.697Z',
      updatedAt: '2025-04-09T21:10:16.483Z',
      enabled: true,
      params: {
        alertsIndexPattern: '.alerts-security.alerts-default',
        apiConfig: {
          connectorId: 'sonnet-3-7',
          actionTypeId: '.bedrock',
          name: 'Sonnet 3.7',
        },
        end: 'now',
        size: 100,
        start: 'now-24h',
      },
      schedule: {
        interval: '10m',
      },
      actions: [],
      lastExecution: {
        date: '2025-04-09T21:01:08.276Z',
        status: 'ok',
        duration: 26,
      },
    },
    {
      id: '6826fb6f-de83-4e19-b9e4-15718bda02e6',
      name: 'Schedule 2',
      createdBy: 'elastic',
      updatedBy: 'elastic',
      createdAt: '2025-04-09T08:51:04.697Z',
      updatedAt: '2025-04-09T21:10:16.483Z',
      enabled: false,
      params: {
        alertsIndexPattern: '.alerts-security.alerts-default',
        apiConfig: {
          connectorId: 'gpt-4o',
          actionTypeId: '.gen-ai',
          name: 'Test GPT-4o',
        },
        end: 'now',
        size: 120,
        start: 'now-24h',
      },
      schedule: {
        interval: '30m',
      },
      actions: [],
      lastExecution: {
        date: '2025-04-09T21:01:08.276Z',
        status: 'ok',
        duration: 26,
      },
    },
  ],
};
