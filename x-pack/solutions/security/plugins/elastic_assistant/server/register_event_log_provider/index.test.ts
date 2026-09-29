/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';

import type { IEventLogService } from '@kbn/event-log-plugin/server';

import { registerEventLogProvider } from '.';
import { ATTACK_DISCOVERY_EVENT_ACTIONS, ATTACK_DISCOVERY_EVENT_PROVIDER } from '@kbn/discoveries';

describe('registerEventLogProvider', () => {
  let eventLog: IEventLogService;

  beforeEach(() => {
    eventLog = {
      getProviderActionId: vi.fn().mockReturnValue(''),
      getProviderActionName: vi.fn().mockReturnValue(''),
      getProviderActions: vi.fn().mockReturnValue([]),
      getProviderActionsForProvider: vi.fn().mockReturnValue([]),
      isIndexingEntries: vi.fn().mockReturnValue(true),
      isLoggingEntries: vi.fn().mockReturnValue(true),
      isProviderActionRegistered: vi.fn().mockReturnValue(false),
      registerProviderActions: vi.fn(),
    } as unknown as IEventLogService;
  });

  it('calls registerProviderActions with correct provider and actions', () => {
    registerEventLogProvider(eventLog);

    expect(eventLog.registerProviderActions).toHaveBeenCalledWith(
      ATTACK_DISCOVERY_EVENT_PROVIDER,
      ATTACK_DISCOVERY_EVENT_ACTIONS
    );
  });
});
