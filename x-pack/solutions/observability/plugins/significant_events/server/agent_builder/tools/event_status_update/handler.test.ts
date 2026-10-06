/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { updateEventStatusToolHandler } from './handler';

const makeLogger = () =>
  ({ error: jest.fn(), warn: jest.fn(), info: jest.fn(), debug: jest.fn() } as never);

describe('updateEventStatusToolHandler', () => {
  it('creates a new event version when status changes', async () => {
    const eventClient = {
      findLatestByEventId: jest.fn().mockResolvedValue({
        event_id: 'event-id-1',
        status: 'active',
      }),
      bulkCreate: jest.fn().mockResolvedValue({}),
    };

    const result = await updateEventStatusToolHandler({
      eventClient: eventClient as never,
      eventId: 'event-id-1',
      status: 'inactive',
      logger: makeLogger(),
    });

    expect(eventClient.bulkCreate).toHaveBeenCalledTimes(1);
    expect(eventClient.bulkCreate).toHaveBeenCalledWith(
      [expect.objectContaining({ status: 'inactive' })],
      { throwOnFail: true, refresh: 'wait_for' }
    );
    expect(result).toEqual({
      event_id: 'event-id-1',
      updated: 1,
      ignored: 0,
      status: 'inactive',
    });
  });

  it('ignores when event is missing or status unchanged', async () => {
    const eventClientMissing = {
      findLatestByEventId: jest.fn().mockResolvedValue(undefined),
      bulkCreate: jest.fn(),
    };
    const missing = await updateEventStatusToolHandler({
      eventClient: eventClientMissing as never,
      eventId: 'event-id-1',
      status: 'inactive',
      logger: makeLogger(),
    });
    expect(missing).toEqual({
      event_id: 'event-id-1',
      updated: 0,
      ignored: 1,
      status: 'inactive',
    });

    const eventClientSame = {
      findLatestByEventId: jest.fn().mockResolvedValue({
        event_id: 'event-id-1',
        status: 'inactive',
      }),
      bulkCreate: jest.fn(),
    };
    const same = await updateEventStatusToolHandler({
      eventClient: eventClientSame as never,
      eventId: 'event-id-1',
      status: 'inactive',
      logger: makeLogger(),
    });
    expect(same).toEqual({
      event_id: 'event-id-1',
      updated: 0,
      ignored: 1,
      status: 'inactive',
    });
  });
});
