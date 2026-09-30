/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout-oblt/api';
import { tags } from '@kbn/scout-oblt';
import { v4 as uuidv4 } from 'uuid';
import { significantEventsApiTest as apiTest } from '../../fixtures';
import { COMMON_API_HEADERS } from '../../fixtures/constants';

const EVENTS_ENDPOINT = 'internal/significant_events/events';
const EVENTS_DATA_STREAM = '.significant_events-events';

// The queried window is 2026-01-02; "today" is 2026-01-03.
const WINDOW_FROM = '2026-01-02T00:00:00.000Z';
const WINDOW_TO = '2026-01-02T23:59:59.999Z';

type EventStatus = 'open' | 'closed';

interface EventVersion {
  eventId: string;
  timestamp: string;
  status: EventStatus;
}

apiTest.describe(
  'Significant events list time range',
  { tag: [...tags.stateful.classic, ...tags.serverless.observability.complete] },
  () => {
    const suffix = uuidv4().slice(0, 8);
    const streamName = `logs.events_time_range_${suffix}`;
    const eventId = (name: string) => `${name}-${suffix}`;

    const versions: EventVersion[] = [
      // Discovered in the window, closed after it: shown in its current (closed) state.
      { eventId: eventId('closed-after'), timestamp: '2026-01-02T10:00:00.000Z', status: 'open' },
      { eventId: eventId('closed-after'), timestamp: '2026-01-03T09:00:00.000Z', status: 'closed' },
      // Discovered before the window, closed during it.
      { eventId: eventId('closed-during'), timestamp: '2026-01-01T10:00:00.000Z', status: 'open' },
      {
        eventId: eventId('closed-during'),
        timestamp: '2026-01-02T12:00:00.000Z',
        status: 'closed',
      },
      // Discovered long before the window and never updated, but still open.
      { eventId: eventId('still-open'), timestamp: '2025-12-20T10:00:00.000Z', status: 'open' },
      // Discovered and closed before the window.
      { eventId: eventId('closed-before'), timestamp: '2026-01-01T08:00:00.000Z', status: 'open' },
      {
        eventId: eventId('closed-before'),
        timestamp: '2026-01-01T09:00:00.000Z',
        status: 'closed',
      },
      // Discovered after the window.
      { eventId: eventId('created-after'), timestamp: '2026-01-03T08:00:00.000Z', status: 'open' },
    ];

    apiTest.beforeAll(async ({ esClient }) => {
      await esClient.bulk({
        refresh: 'wait_for',
        operations: versions.flatMap(({ eventId: id, timestamp, status }) => [
          { create: { _index: EVENTS_DATA_STREAM } },
          {
            '@timestamp': timestamp,
            kibana: { space_ids: ['default'] },
            event_uuid: uuidv4(),
            event_id: id,
            status,
            severity: '40-medium',
            confidence: 0.8,
            stream_names: [streamName],
            title: `Event ${id}`,
            summary: `Summary for ${id}`,
          },
        ]),
      });
    });

    apiTest.afterAll(async ({ esClient }) => {
      await esClient.deleteByQuery({
        index: EVENTS_DATA_STREAM,
        query: { term: { stream_names: streamName } },
        refresh: true,
        conflicts: 'proceed',
      });
    });

    apiTest(
      'returns events active during the range in their current state',
      async ({ apiClient, samlAuth }) => {
        const { cookieHeader } = await samlAuth.asStreamsAdmin();

        const query = new URLSearchParams({
          from: WINDOW_FROM,
          to: WINDOW_TO,
          stream: streamName,
          perPage: '100',
        });
        const response = await apiClient.get(`${EVENTS_ENDPOINT}?${query.toString()}`, {
          headers: { ...COMMON_API_HEADERS, ...cookieHeader },
          responseType: 'json',
        });

        expect(response).toHaveStatusCode(200);
        const hits: Array<{ event_id: string; status: EventStatus; created_at: string }> =
          response.body.hits;
        const byEventId = Object.fromEntries(hits.map((hit) => [hit.event_id, hit]));

        expect(Object.keys(byEventId).sort()).toStrictEqual(
          [eventId('closed-after'), eventId('closed-during'), eventId('still-open')].sort()
        );
        expect(byEventId[eventId('closed-after')]).toMatchObject({
          status: 'closed',
          created_at: '2026-01-02T10:00:00.000Z',
        });
        expect(byEventId[eventId('closed-during')]).toMatchObject({
          status: 'closed',
          created_at: '2026-01-01T10:00:00.000Z',
        });
        expect(byEventId[eventId('still-open')]).toMatchObject({
          status: 'open',
          created_at: '2025-12-20T10:00:00.000Z',
        });
        expect(response.body.total).toBe(3);
      }
    );
  }
);
