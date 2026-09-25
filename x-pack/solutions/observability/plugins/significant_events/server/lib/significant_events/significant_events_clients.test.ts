/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { BehaviorSubject, of } from 'rxjs';
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

  it('getEventClient() always returns EventClient, regardless of useRuleEventsRead$', async () => {
    const eventClient = {};
    const services: SignificantEventsServices = {
      detection: { getClient: jest.fn() } as never,
      event: { getClient: jest.fn().mockReturnValue(eventClient) } as never,
    };
    const clients = createSignificantEventsClients({
      services,
      dataStreams: { initializeClient: jest.fn().mockResolvedValue({}) } as never,
      esClient: {} as never,
      space: 'default',
      useRuleEventsRead$: of(true),
    });

    await expect(clients.getEventClient()).resolves.toBe(eventClient);
    expect(services.event.getClient).toHaveBeenCalledWith(
      expect.not.objectContaining({ useRuleEventsRead: expect.anything() })
    );
  });

  it('getEventSearchClient() returns RuleEventsClient when useRuleEventsRead$ emits true and EventClient when false/omitted', async () => {
    const ruleEventsClient = {};
    const eventClient = {};
    const getClient = jest.fn(({ useRuleEventsRead }: { useRuleEventsRead?: boolean }) =>
      useRuleEventsRead ? ruleEventsClient : eventClient
    );
    const services: SignificantEventsServices = {
      detection: { getClient: jest.fn() } as never,
      event: { getClient } as never,
    };

    const clientsWithFlagOn = createSignificantEventsClients({
      services,
      dataStreams: { initializeClient: jest.fn().mockResolvedValue({}) } as never,
      esClient: {} as never,
      space: 'default',
      useRuleEventsRead$: of(true),
    });
    await expect(clientsWithFlagOn.getEventSearchClient()).resolves.toBe(ruleEventsClient);

    const clientsWithFlagOff = createSignificantEventsClients({
      services,
      dataStreams: { initializeClient: jest.fn().mockResolvedValue({}) } as never,
      esClient: {} as never,
      space: 'default',
    });
    await expect(clientsWithFlagOff.getEventSearchClient()).resolves.toBe(eventClient);
  });

  it('getEventSearchClient() follows a later useRuleEventsRead$ emission', async () => {
    const ruleEventsClient = {};
    const eventClient = {};
    const getClient = jest.fn(({ useRuleEventsRead }: { useRuleEventsRead?: boolean }) =>
      useRuleEventsRead ? ruleEventsClient : eventClient
    );
    const useRuleEventsRead$ = new BehaviorSubject(false);
    const clients = createSignificantEventsClients({
      services: {
        detection: { getClient: jest.fn() } as never,
        event: { getClient } as never,
      },
      dataStreams: { initializeClient: jest.fn().mockResolvedValue({}) } as never,
      esClient: {} as never,
      space: 'default',
      useRuleEventsRead$,
    });

    await expect(clients.getEventSearchClient()).resolves.toBe(eventClient);

    useRuleEventsRead$.next(true);

    await expect(clients.getEventSearchClient()).resolves.toBe(ruleEventsClient);
  });
});
