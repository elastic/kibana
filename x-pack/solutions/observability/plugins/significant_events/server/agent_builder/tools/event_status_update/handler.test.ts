/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { asRuleEventsClient } from '../../../lib/significant_events/events/rule_events_client.mock';
import { updateEventStatusToolHandler } from './handler';

describe('updateEventStatusToolHandler', () => {
  it('creates an alert action for the stored episode when the status changes', async () => {
    const eventClient = {
      findLatestByEventId: jest.fn().mockResolvedValue({
        event_id: 'event-id-1',
        status: 'active',
        episode_id: 'episode-1',
      }),
    };
    const alertActionsClient = { createEpisodeAction: jest.fn().mockResolvedValue(undefined) };

    const result = await updateEventStatusToolHandler({
      eventSearchClient: asRuleEventsClient(eventClient, {
        getAlertActionsClient: async () => alertActionsClient as never,
      }),
      eventId: 'event-id-1',
      status: 'inactive',
    });

    expect(alertActionsClient.createEpisodeAction).toHaveBeenCalledTimes(1);
    expect(alertActionsClient.createEpisodeAction).toHaveBeenCalledWith({
      episodeId: 'episode-1',
      action: expect.objectContaining({ action_type: 'deactivate' }),
    });
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
