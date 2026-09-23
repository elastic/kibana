/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { updateEventStatusToolHandler } from './handler';

describe('updateEventStatusToolHandler', () => {
  it('creates a new event version when status changes', async () => {
    const eventClient = {
      findByEventUuid: jest.fn().mockResolvedValue({
        hits: [{ event_uuid: 'event-1', event_id: 'event-id-1', status: 'open' }],
      }),
      findByEventId: jest.fn().mockResolvedValue({
        hits: [{ event_uuid: 'event-1', event_id: 'event-id-1', status: 'open' }],
      }),
      bulkCreate: jest.fn().mockResolvedValue({}),
    };

    const result = await updateEventStatusToolHandler({
      eventClient: eventClient as never,
      eventUuid: 'event-1',
      status: 'closed',
    });

    expect(eventClient.bulkCreate).toHaveBeenCalledTimes(1);
    expect(eventClient.bulkCreate).toHaveBeenCalledWith(
      [expect.objectContaining({ status: 'closed' })],
      { throwOnFail: true, refresh: 'wait_for' }
    );
    expect(result.event_uuid).not.toBe('event-1');
    expect(result).toEqual({
      event_uuid: result.event_uuid,
      updated: 1,
      ignored: 0,
      status: 'closed',
    });
  });

  it('ignores when event is missing or status unchanged', async () => {
    const eventClientMissing = {
      findByEventUuid: jest.fn().mockResolvedValue({ hits: [] }),
      findByEventId: jest.fn(),
      bulkCreate: jest.fn(),
    };
    const missing = await updateEventStatusToolHandler({
      eventClient: eventClientMissing as never,
      eventUuid: 'event-1',
      status: 'dismissed',
    });
    expect(missing).toEqual({ event_uuid: 'event-1', updated: 0, ignored: 1, status: 'dismissed' });

    const eventClientSame = {
      findByEventUuid: jest.fn().mockResolvedValue({
        hits: [{ event_uuid: 'event-1', event_id: 'event-id-1', status: 'dismissed' }],
      }),
      findByEventId: jest.fn().mockResolvedValue({
        hits: [{ event_uuid: 'event-1', event_id: 'event-id-1', status: 'dismissed' }],
      }),
      bulkCreate: jest.fn(),
    };
    const same = await updateEventStatusToolHandler({
      eventClient: eventClientSame as never,
      eventUuid: 'event-1',
      status: 'dismissed',
    });
    expect(same).toEqual({ event_uuid: 'event-1', updated: 0, ignored: 1, status: 'dismissed' });
  });
});
