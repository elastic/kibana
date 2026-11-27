/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AgentInventoryRow, InventoryPerson } from '../types';

export const mockPerson = (
  overrides: Partial<InventoryPerson> & { entityId: string }
): InventoryPerson => ({
  name: overrides.entityId,
  emails: [],
  watchlistIds: [],
  ...overrides,
});

export const mockInventoryRow = (
  overrides: Partial<AgentInventoryRow> & { entityId: string }
): AgentInventoryRow => ({
  agentName: 'claude_code',
  hostId: 'host-1',
  userName: 'ec2-user',
  hostName: 'build-01',
  version: '2.1.332',
  firstSeen: '2026-11-10T10:00:00.000Z',
  lastSeen: '2026-11-26T11:00:00.000Z',
  watchlistIds: [],
  accountEmails: [],
  accountIds: [],
  dependsOnIds: [],
  dataSources: [],
  alertCount: 0,
  accounts: [],
  ...overrides,
});
