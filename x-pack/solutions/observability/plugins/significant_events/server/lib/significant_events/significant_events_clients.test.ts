/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { detectionsDataStream } from './detections';
import { RuleEventsClient } from './events';
import {
  createSignificantEventsClients,
  type SignificantEventsServices,
} from './significant_events_clients';

describe('createSignificantEventsClients', () => {
  it('initializes the detection Core client only when requested', async () => {
    const detectionClient = {};
    const services: SignificantEventsServices = {
      detection: { getClient: jest.fn().mockReturnValue(detectionClient) } as never,
    };
    const initializeClient = jest.fn(async () => ({}));

    const clients = createSignificantEventsClients({
      services,
      dataStreams: { initializeClient } as never,
      esClient: {} as never,
      space: 'default',
    });

    expect(initializeClient).not.toHaveBeenCalled();
    await expect(clients.getDetectionClient()).resolves.toBe(detectionClient);
    expect(initializeClient).toHaveBeenCalledTimes(1);
    expect(initializeClient).toHaveBeenCalledWith(detectionsDataStream.name);
  });

  it('getEventSearchClient() always returns a RuleEventsClient', async () => {
    const clients = createSignificantEventsClients({
      services: { detection: { getClient: jest.fn() } as never },
      dataStreams: { initializeClient: jest.fn() } as never,
      esClient: {} as never,
      space: 'default',
    });

    await expect(clients.getEventSearchClient()).resolves.toBeInstanceOf(RuleEventsClient);
  });

  it('exposes the provided trigger emitter', () => {
    const triggerEmitter = jest.fn();
    const clients = createSignificantEventsClients({
      services: { detection: { getClient: jest.fn() } as never },
      dataStreams: { initializeClient: jest.fn() } as never,
      esClient: {} as never,
      space: 'default',
      triggerEmitter,
    });

    expect(clients.emitTrigger).toBe(triggerEmitter);
  });
});
