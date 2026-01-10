/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as t from 'io-ts';
import { createObservabilityServerRoute } from '../create_observability_server_route';
import { EventsService } from '../../lib/events/events_service';
import { getMockEventsForProvider, getAllMockEvents } from '../../lib/events/mocks';
import { EVENTS_API_URLS } from '../../../common/types/events';
import type {
  ExternalEvent,
  ExternalEventInput,
  EventSource,
  EventSeverity,
  EventStatus,
} from '../../../common/types/events';

// GET /api/observability/events - Query events
const getEventsRoute = createObservabilityServerRoute({
  endpoint: `GET ${EVENTS_API_URLS.EVENTS}`,
  security: {
    authz: {
      enabled: false,
      reason: 'This is a PoC endpoint for external events - no auth required',
    },
  },
  options: { access: 'public' },
  params: t.partial({
    query: t.partial({
      from: t.string,
      to: t.string,
      source: t.string,
      severity: t.string,
      status: t.string,
      size: t.string,
      id: t.string, // Single ID
      ids: t.string, // Comma-separated IDs
    }),
  }),
  handler: async ({ context, params }): Promise<{ events: ExternalEvent[]; total: number }> => {
    const coreContext = await context.core;
    const esClient = coreContext.elasticsearch.client.asCurrentUser;
    const eventsService = new EventsService(esClient);

    const query = params?.query || {};

    // If IDs are provided, fetch by IDs
    if (query.id || query.ids) {
      const idList = query.ids ? query.ids.split(',') : query.id ? [query.id] : [];
      return eventsService.getEventsByIds(idList);
    }

    return eventsService.getEvents({
      from: query.from,
      to: query.to,
      source: query.source,
      severity: query.severity as EventSeverity | undefined,
      status: query.status as EventStatus | undefined,
      size: query.size ? parseInt(query.size, 10) : undefined,
    });
  },
});

// POST /api/observability/events - Create event(s)
// Accepts optional connector_id query parameter for connector integration
const createEventsRoute = createObservabilityServerRoute({
  endpoint: `POST ${EVENTS_API_URLS.EVENTS}`,
  security: {
    authz: {
      enabled: false,
      reason: 'This is a PoC endpoint for external events - no auth required',
    },
  },
  options: { access: 'public' },
  params: t.intersection([
    t.type({
    body: t.union([
      // Single event
        t.intersection([
      t.type({
        title: t.string,
        message: t.string,
        severity: t.string,
        source: t.string,
      }),
          t.partial({
            timestamp: t.string,
            status: t.string,
            tags: t.array(t.string),
            links: t.array(t.type({ label: t.string, url: t.string })),
            raw_payload: t.record(t.string, t.unknown),
            fingerprint: t.string,
            connector_id: t.string,
          }),
        ]),
      // Batch of events
      t.type({
        events: t.array(
            t.intersection([
          t.type({
            title: t.string,
            message: t.string,
            severity: t.string,
            source: t.string,
              }),
              t.partial({
                timestamp: t.string,
                status: t.string,
                tags: t.array(t.string),
                links: t.array(t.type({ label: t.string, url: t.string })),
                raw_payload: t.record(t.string, t.unknown),
                fingerprint: t.string,
                connector_id: t.string,
              }),
            ])
        ),
      }),
    ]),
  }),
    t.partial({
      query: t.partial({
        connector_id: t.string,
      }),
    }),
  ]),
  handler: async ({
    context,
    params,
  }): Promise<{ event?: ExternalEvent; events?: ExternalEvent[]; count: number }> => {
    const coreContext = await context.core;
    const esClient = coreContext.elasticsearch.client.asCurrentUser;
    const eventsService = new EventsService(esClient);

    // connector_id can come from query param (legacy) or body (preferred)
    const queryConnectorId = params.query?.connector_id;
    const body = params.body as ExternalEventInput | { events: ExternalEventInput[] };

    // Check if it's a batch request
    if ('events' in body && Array.isArray(body.events)) {
      // Use body connector_id if present, otherwise fall back to query param
      const eventsWithConnector = body.events.map((event) => ({
        ...event,
        connector_id: event.connector_id || queryConnectorId,
      }));
      const events = await eventsService.createEvents(eventsWithConnector);
      return { events, count: events.length };
    }

    // Single event - use body connector_id if present, otherwise fall back to query param
    const singleEvent = body as ExternalEventInput;
    const eventWithConnector = {
      ...singleEvent,
      connector_id: singleEvent.connector_id || queryConnectorId,
    };
    const event = await eventsService.createEvent(eventWithConnector);
    return { event, count: 1 };
  },
});

// POST /api/observability/events/mock - Generate mock events
const createMockEventsRoute = createObservabilityServerRoute({
  endpoint: `POST ${EVENTS_API_URLS.EVENTS_MOCK}`,
  security: {
    authz: {
      enabled: false,
      reason: 'This is a PoC endpoint for generating mock events - no auth required',
    },
  },
  options: { access: 'public' },
  params: t.partial({
    query: t.partial({
      provider: t.string,
      count: t.string,
      connector_id: t.string,
    }),
  }),
  handler: async ({
    context,
    params,
  }): Promise<{ events: ExternalEvent[]; count: number; provider: string }> => {
    const coreContext = await context.core;
    const esClient = coreContext.elasticsearch.client.asCurrentUser;
    const eventsService = new EventsService(esClient);

    const query = params?.query || {};
    const provider = (query.provider as EventSource) || 'prometheus';
    const count = query.count ? parseInt(query.count, 10) : 5;
    const connectorId = query.connector_id;

    // Get mock events for the provider
    let mockEvents: ExternalEventInput[];
    if (provider === 'all') {
      mockEvents = getAllMockEvents();
    } else {
      mockEvents = getMockEventsForProvider(provider as EventSource);
    }

    if (mockEvents.length === 0) {
      return { events: [], count: 0, provider };
    }

    // Create the requested number of events (cycling through available mocks)
    const eventsToCreate: ExternalEventInput[] = [];
    for (let i = 0; i < count; i++) {
      const mockEvent = mockEvents[i % mockEvents.length];
      eventsToCreate.push({
        ...mockEvent,
        // Add some variation to timestamps
        timestamp: new Date(Date.now() - i * 60000).toISOString(), // Each event 1 minute apart
        connector_id: connectorId,
      });
    }

    const events = await eventsService.createEvents(eventsToCreate);
    return { events, count: events.length, provider };
  },
});

// Note: The webhook route is registered directly in plugin.ts to bypass strict body validation
// See: ./webhook_route.ts

export const eventsRouteRepository = {
  ...getEventsRoute,
  ...createEventsRoute,
  ...createMockEventsRoute,
};
