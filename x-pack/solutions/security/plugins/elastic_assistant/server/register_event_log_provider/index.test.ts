/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IEventLogService } from '@kbn/event-log-plugin/server';

import { registerEventLogProvider } from '.';
import {
  ATTACK_DISCOVERY_EVENT_ACTIONS,
  ATTACK_DISCOVERY_EVENT_PROVIDER,
} from '../../common/constants';

describe('registerEventLogProvider', () => {
  let eventLog: IEventLogService;

  beforeEach(() => {
    eventLog = {
      getProviderActionId: jest.fn().mockReturnValue(''),
      getProviderActionName: jest.fn().mockReturnValue(''),
      getProviderActions: jest.fn().mockReturnValue([]),
      getProviderActionsForProvider: jest.fn().mockReturnValue([]),
      isIndexingEntries: jest.fn().mockReturnValue(true),
      isLoggingEntries: jest.fn().mockReturnValue(true),
      isProviderActionRegistered: jest.fn().mockReturnValue(false),
      registerProviderActions: jest.fn(),
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
