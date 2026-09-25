/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { detectionsDataStream } from './detections';
import { eventsDataStream } from './events';
import {
  createSignificantEventsClients,
  type SignificantEventsServices,
} from './significant_events_clients';

describe('createSignificantEventsClients', () => {
  it('initializes each Core client only when requested', async () => {
    const detectionClient = {};
    const eventClient = {};
    const detectionDataStreamClient = {};
    const eventDataStreamClient = {};
    const services: SignificantEventsServices = {
      detection: { getClient: jest.fn().mockReturnValue(detectionClient) } as never,
      event: { getClient: jest.fn().mockReturnValue(eventClient) } as never,
    };
    const initializeClient = jest.fn(async (name: string) =>
      name === detectionsDataStream.name ? detectionDataStreamClient : eventDataStreamClient
    );

    const clients = createSignificantEventsClients({
      services,
      dataStreams: { initializeClient } as never,
      esClient: {} as never,
      space: 'default',
    });

    expect(initializeClient).not.toHaveBeenCalled();
    await expect(clients.getDetectionClient()).resolves.toBe(detectionClient);
    await expect(clients.getEventClient()).resolves.toBe(eventClient);
    expect(initializeClient).toHaveBeenNthCalledWith(1, detectionsDataStream.name);
    expect(initializeClient).toHaveBeenNthCalledWith(2, eventsDataStream.name);
  });

  it('rejects getEventClient() when useRuleEventsRead is true (no call site is migrated yet)', async () => {
    const services: SignificantEventsServices = {
      detection: { getClient: jest.fn() } as never,
      event: { getClient: jest.fn() } as never,
    };
    const clients = createSignificantEventsClients({
      services,
      dataStreams: { initializeClient: jest.fn().mockResolvedValue({}) } as never,
      esClient: {} as never,
      space: 'default',
      useRuleEventsRead: true,
    });

    await expect(clients.getEventClient()).rejects.toThrow(
      /SIGNIFICANT_EVENTS_USE_RULE_EVENTS_READ is not yet safe/
    );
  });
});
