/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { asRuleEventsClient } from '../../../lib/significant_events/events/rule_events_client.mock';
import { updateEventStatusToolHandler } from './handler';

describe('updateEventStatusToolHandler', () => {
  it('creates a new event version when status changes', async () => {
    const eventClient = {
      findLatestByEventId: jest.fn().mockResolvedValue({
        event_id: 'event-id-1',
        status: 'active',
      }),
    };
    const alertEventsClient = { createAlertEvent: jest.fn().mockResolvedValue(undefined) };

    const result = await updateEventStatusToolHandler({
      eventSearchClient: asRuleEventsClient(eventClient, {
        getAlertEventsClient: async () => alertEventsClient as never,
      }),
      eventId: 'event-id-1',
      status: 'inactive',
    });

    expect(alertEventsClient.createAlertEvent).toHaveBeenCalledTimes(1);
    expect(alertEventsClient.createAlertEvent).toHaveBeenCalledWith(
      expect.objectContaining({ alert_status: 'inactive' })
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
    };
    const missing = await updateEventStatusToolHandler({
      eventSearchClient: asRuleEventsClient(eventClientMissing),
      eventId: 'event-id-1',
      status: 'inactive',
    });
    expect(missing).toEqual({
      event_id: 'event-id-1',
      updated: 0,
      ignored: 1,
      status: 'inactive',
      reason: 'not_found',
    });

    const eventClientSame = {
      findLatestByEventId: jest.fn().mockResolvedValue({
        event_id: 'event-id-1',
        status: 'inactive',
      }),
    };
    const same = await updateEventStatusToolHandler({
      eventSearchClient: asRuleEventsClient(eventClientSame),
      eventId: 'event-id-1',
      status: 'inactive',
    });
    expect(same).toEqual({
      event_id: 'event-id-1',
      updated: 0,
      ignored: 1,
      status: 'inactive',
      reason: 'already_in_state',
    });
  });
});
