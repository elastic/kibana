/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { elasticsearchServiceMock } from '@kbn/core/server/mocks';
import { fetchEventsAndScopedAlerts } from './process_events_route';
import {
  TEST_PROCESS_INDEX,
  TEST_SESSION_START_TIME,
  mockEvents,
  mockAlerts,
} from '../../common/mocks/constants/session_view_process.mock';
import { ALERT_ORIGINAL_TIME_PROPERTY } from '../../common/constants';
import { getAlertsClientMockInstance } from './alerts_client_mock.test';
import type { ProcessEvent } from '../../common';

const getEmptyResponse = async () => {
  return {
    hits: {
      total: { value: 0, relation: 'eq' },
      hits: [],
    },
  };
};

const getResponse = async () => {
  return {
    hits: {
      total: { value: mockEvents.length, relation: 'eq' },
      hits: mockEvents.map((event) => {
        return { _source: event };
      }),
    },
  };
};

describe('process_events_route.ts', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  describe('fetchEventsAndScopedAlerts(client, entityId, cursor, forward)', () => {
    it('should return an empty events array for a non existant entity_id', async () => {
      const client = elasticsearchServiceMock.createElasticsearchClient(getEmptyResponse());
      const alertsClient = getAlertsClientMockInstance(client);

      const body = await fetchEventsAndScopedAlerts(
        client,
        alertsClient,
        TEST_PROCESS_INDEX,
        'asdf',
        '',
        undefined
      );

      expect(body.events.length).toBe(0);
      expect(body.total).toBe(0);
    });

    it('returns results for a particular session entity_id', async () => {
      const client = elasticsearchServiceMock.createElasticsearchClient(getResponse());
      const alertsClient = getAlertsClientMockInstance();

      const body = await fetchEventsAndScopedAlerts(
        client,
        alertsClient,
        TEST_PROCESS_INDEX,
        'mockId',
        TEST_SESSION_START_TIME,
        undefined
      );

      expect(body.events.length).toBe(mockEvents.length + mockAlerts.length);

      const eventsOnly = body.events.filter(
        (event) => (event._source as ProcessEvent)?.event?.kind === 'event'
      );
      const alertsOnly = body.events.filter(
        (event) => (event._source as ProcessEvent)?.event?.kind === 'signal'
      );
      expect(eventsOnly.length).toBe(mockEvents.length);
      expect(alertsOnly.length).toBe(mockAlerts.length);
      expect(body.total).toBe(mockEvents.length);
    });

    it('returns hits in reverse order when paginating backwards', async () => {
      const client = elasticsearchServiceMock.createElasticsearchClient(getResponse());
      const alertsClient = getAlertsClientMockInstance();

      const body = await fetchEventsAndScopedAlerts(
        client,
        alertsClient,
        TEST_PROCESS_INDEX,
        'mockId',
        TEST_SESSION_START_TIME,
        undefined,
        false
      );

      // output events are mixed in
      const eventsWithoutOutput = body.events.filter((event) => {
        const { action, kind } = (event._source as ProcessEvent)?.event || {};

        return action !== 'text_output' && kind === 'event';
      });

      expect(eventsWithoutOutput[0]._source).toEqual(mockEvents[mockEvents.length - 1]);
    });

    describe('alerts range', () => {
      // An alert is raised after the process event that caused it. If the alert range stops at the last process
      // event of a page, an alert newer than every event is never loaded and its process row shows no badge.
      type RangeClause = { range?: Record<string, { gte: string; lte?: string }> };

      const firstTimestamp = mockEvents[0]['@timestamp'];
      const lastTimestamp = mockEvents[mockEvents.length - 1]['@timestamp'];

      const fetchAndGetAlertsRange = async (
        cursor: string | undefined,
        forward: boolean,
        pageSize?: number
      ) => {
        const client = elasticsearchServiceMock.createElasticsearchClient(getResponse());
        const alertsClient = getAlertsClientMockInstance();
        const find = jest.spyOn(alertsClient, 'find');

        await fetchEventsAndScopedAlerts(
          client,
          alertsClient,
          TEST_PROCESS_INDEX,
          'mockId',
          TEST_SESSION_START_TIME,
          cursor,
          forward,
          pageSize
        );

        expect(find).toHaveBeenCalledTimes(1);
        const { query } = find.mock.calls[0][0];
        const { must } = (query as { bool: { must: RangeClause[] } }).bool;

        return must.find((clause) => clause.range)?.range?.[ALERT_ORIGINAL_TIME_PROPERTY];
      };

      it('leaves the range open on the last page of the session', async () => {
        // the page holds fewer events than requested, so no later process event exists
        const range = await fetchAndGetAlertsRange(undefined, true);

        expect(range).toEqual({ gte: firstTimestamp });
      });

      it('stops the range at the last event when more pages follow', async () => {
        // the page is full, so later process events (and the alerts they cause) come with the next page
        const range = await fetchAndGetAlertsRange(undefined, true, mockEvents.length);

        expect(range).toEqual({ gte: firstTimestamp, lte: lastTimestamp });
      });

      it('extends a backward page up to its cursor when the cursor is newer than its last event', async () => {
        // opened from an alert newer than every process event: the forward page is empty, so the
        // backward page uses the alert time as its cursor
        const cursor = '2021-11-23T15:25:06.510Z';
        const range = await fetchAndGetAlertsRange(cursor, false);

        expect(range).toEqual({
          gte: mockEvents[mockEvents.length - 1]['@timestamp'],
          lte: cursor,
        });
      });

      it('stops a backward page at its last event when the cursor is not newer', async () => {
        const range = await fetchAndGetAlertsRange(firstTimestamp, false);

        expect(range?.lte).toBe(mockEvents[0]['@timestamp']);
      });
    });
  });
});
