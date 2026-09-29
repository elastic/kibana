/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';

import { updateEventStatusToolHandler } from './handler';

const makeLogger = () =>
  ({ error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() } as never);

describe('updateEventStatusToolHandler', () => {
  it('creates a new event version when status changes', async () => {
    const eventClient = {
      findByEventUuid: vi.fn().mockResolvedValue({
        hits: [{ event_uuid: 'event-1', event_id: 'event-id-1', status: 'open' }],
      }),
      findLatestByEventId: vi.fn().mockResolvedValue({
        event_uuid: 'event-1',
        event_id: 'event-id-1',
        status: 'open',
      }),
      bulkCreate: vi.fn().mockResolvedValue({}),
    };

    const result = await updateEventStatusToolHandler({
      eventClient: eventClient as never,
      eventUuid: 'event-1',
      status: 'closed',
      logger: makeLogger(),
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
      findByEventUuid: vi.fn().mockResolvedValue({ hits: [] }),
      findLatestByEventId: vi.fn().mockResolvedValue(undefined),
      bulkCreate: vi.fn(),
    };
    const missing = await updateEventStatusToolHandler({
      eventClient: eventClientMissing as never,
      eventUuid: 'event-1',
      status: 'dismissed',
      logger: makeLogger(),
    });
    expect(missing).toEqual({ updated: 0, ignored: 1, status: 'dismissed' });

    const eventClientSame = {
      findByEventUuid: vi.fn().mockResolvedValue({
        hits: [{ event_uuid: 'event-1', event_id: 'event-id-1', status: 'dismissed' }],
      }),
      findLatestByEventId: vi.fn().mockResolvedValue({
        event_uuid: 'event-1',
        event_id: 'event-id-1',
        status: 'dismissed',
      }),
      bulkCreate: vi.fn(),
    };
    const same = await updateEventStatusToolHandler({
      eventClient: eventClientSame as never,
      eventUuid: 'event-1',
      status: 'dismissed',
      logger: makeLogger(),
    });
    expect(same).toEqual({ event_uuid: 'event-1', updated: 0, ignored: 1, status: 'dismissed' });
  });
});
