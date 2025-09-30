/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IEventLogService } from '@kbn/event-log-plugin/server';
import { eventLogServiceMock } from '@kbn/event-log-plugin/server/mocks';

import { createEventLogger } from '.';
import { ATTACK_DISCOVERY_EVENT_PROVIDER } from '../../common/constants';

describe('createEventLogger', () => {
  let mockEventLogService: jest.Mocked<IEventLogService>;

  beforeEach(() => {
    mockEventLogService = eventLogServiceMock.create();
  });

  it('calls eventLog.getLogger with the correct parameters', () => {
    createEventLogger(mockEventLogService);

    expect(mockEventLogService.getLogger).toHaveBeenCalledWith({
      event: { provider: ATTACK_DISCOVERY_EVENT_PROVIDER },
    });
  });
});
