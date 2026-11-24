/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { schema } from '@kbn/config-schema';
import { transformError } from '@kbn/securitysolution-es-utils';
import _ from 'lodash';
import type { ElasticsearchClient } from '@kbn/core/server';
import type { IRouter, Logger } from '@kbn/core/server';
import type {
  AlertsClient,
  RuleRegistryPluginStartContract,
} from '@kbn/rule-registry-plugin/server';
import { EVENT_ACTION } from '@kbn/rule-data-utils';
import type { SearchHit } from '@kbn/es-types';
import {
  ALERTS_PER_PROCESS_EVENTS_PAGE,
  PROCESS_EVENTS_ROUTE,
  PROCESS_EVENTS_PER_PAGE,
  ENTRY_SESSION_ENTITY_ID_PROPERTY,
  TIMESTAMP_PROPERTY,
  PROCESS_EVENT_FIELDS,
  EVENT_ACTION_EXECUTED,
  EVENT_ACTION_END,
  EVENT_ACTION_EXEC,
  EVENT_ACTION_FORK,
} from '../../common/constants';
import type { ProcessEvent } from '../../common';
import { searchAlerts } from './alerts_route';
import { searchProcessWithIOEvents } from './io_events_route';
import {
  sessionEntityIdSchema,
  sessionTimestampSchema,
  sessionViewIndexPatternSchema,
} from './validation';
import { normalizeEventProcessArgs } from '../../common/utils/process_args_normalizer';

export const registerProcessEventsRoute = (
  router: IRouter,
  logger: Logger,
  ruleRegistry: RuleRegistryPluginStartContract
) => {
  router.versioned
    .get({
      access: 'internal',
      path: PROCESS_EVENTS_ROUTE,
      security: {
        authz: {
          enabled: false,
          reason: `This route delegates authorization to Elasticsearch and it's not tied to a Kibana privilege.`,
        },
      },
    })
    .addVersion(
      {
        version: '1',
        validate: {
          request: {
            query: schema.object({
              index: sessionViewIndexPatternSchema,
              sessionEntityId: sessionEntityIdSchema,
              sessionStartTime: sessionTimestampSchema,
              cursor: schema.maybe(sessionTimestampSchema),
              forward: schema.maybe(schema.boolean()),
              pageSize: schema.maybe(schema.number({ min: 1, max: PROCESS_EVENTS_PER_PAGE })), // currently only set in FTR tests to test pagination
            }),
          },
        },
      },
      async (context, request, response) => {
        const client = (await context.core).elasticsearch.client.asCurrentUser;
        const alertsClient = await ruleRegistry.getRacClientWithRequest(request);
        const { index, sessionEntityId, sessionStartTime, cursor, forward, pageSize } =
          request.query;

        try {
          const body = await fetchEventsAndScopedAlerts(
            client,
            alertsClient,
            index,
            sessionEntityId,
            sessionStartTime,
            cursor,
            forward,
            pageSize
          );

          return response.ok({ body });
        } catch (err) {
          const error = transformError(err);
          logger.error(`Failed to fetch process events: ${err}`);

          // unauthorized
          if (err?.meta?.statusCode === 403) {
            return response.ok({ body: { total: 0, events: [] } });
          }

          return response.customError({
            body: { message: error.message },
            statusCode: error.statusCode,
          });
        }
      }
    );
};

// Ensure all added events conform to SearchHit<unknown>
const normalizeToSearchHit = (event: any): SearchHit<unknown> => {
  // If already a SearchHit (has _index), return as is
  if (event && typeof event._index === 'string') {
    return event;
  }
  // Otherwise, add minimal required SearchHit fields
  return {
    _index: '', // Provide a default or meaningful value if available
    _id: '',
    _score: null,
    _source: event._source,
    fields: {},
    sort: [],
  };
};

export const fetchEventsAndScopedAlerts = async (
  client: ElasticsearchClient,
  alertsClient: AlertsClient,
  index: string,
  sessionEntityId: string,
  sessionStartTime: string,
  cursor?: string,
  forward = true,
  pageSize = PROCESS_EVENTS_PER_PAGE
) => {
  const cursorMillis = cursor && new Date(cursor).getTime() + (forward ? -1 : 1);
  // The event query ignores a cursor that is not a date, so the alert range must too: Elasticsearch
  // rejects the range and the alert search then returns no alerts. A cursor that JavaScript parses can
  // still be rejected by the alert date field (for example 2022/05/08), so send the parsed time.
  const cursorTime = cursor ? new Date(cursor).getTime() : NaN;
  const alertsCursor = Number.isNaN(cursorTime) ? undefined : new Date(cursorTime).toISOString();
  const size = Math.min(pageSize, PROCESS_EVENTS_PER_PAGE);

  const search = await client.search({
    index: [index],
    query: {
      bool: {
        must: [
          { term: { [ENTRY_SESSION_ENTITY_ID_PROPERTY]: sessionEntityId } },
          {
            bool: {
              should: [
                { term: { [EVENT_ACTION]: EVENT_ACTION_FORK } },
                { term: { [EVENT_ACTION]: EVENT_ACTION_EXEC } },
                { term: { [EVENT_ACTION]: EVENT_ACTION_EXECUTED } },
                { term: { [EVENT_ACTION]: EVENT_ACTION_END } },
              ],
            },
          },
          {
            range: {
              // optimization to prevent data before this session from being hit.
              [TIMESTAMP_PROPERTY]: {
                gte: sessionStartTime,
              },
            },
          },
        ],
      },
    },
    size,
    sort: [{ '@timestamp': forward ? 'asc' : 'desc' }],
    search_after: cursorMillis ? [cursorMillis] : undefined,
    fields: PROCESS_EVENT_FIELDS,
  });

  let events = search.hits.hits;

  // Normalize args fields to ensure consistent array structure
  events = events.map((hit) => {
    hit._source = normalizeEventProcessArgs(hit._source as ProcessEvent);
    return hit;
  });

  if (!forward) {
    events.reverse();
  }

  const total =
    typeof search.hits.total === 'number' ? search.hits.total : search.hits.total?.value;

  if (events.length === 0 && forward && alertsCursor) {
    // No process event follows the cursor, but alerts raised after it (for example after the alert Session View
    // opened from) can still exist, so search them from the cursor on.
    const alertsBody = await searchAlerts(
      alertsClient,
      sessionEntityId,
      ALERTS_PER_PROCESS_EVENTS_PAGE,
      undefined,
      [alertsCursor]
    );

    return { total, events: alertsBody.events.map(normalizeToSearchHit) };
  }

  if (events.length > 0) {
    // go grab any alerts which happened in this page of events.
    const firstEvent = _.first(events)?._source as ProcessEvent;
    const lastEvent = _.last(events)?._source as ProcessEvent;

    let range;
    let alertsRange;
    let gapRange;

    if (firstEvent?.['@timestamp'] && lastEvent?.['@timestamp']) {
      range = [firstEvent['@timestamp'], lastEvent['@timestamp']];

      // An alert is raised after the process event that caused it, so it can be newer than every event of its
      // session. Nothing bounds the alerts from above on the last page of the session (a short forward page),
      // and a backward page holds the events up to its cursor, so it covers the alerts up to its cursor, which
      // can be newer than its last event.
      if (forward && events.length < size) {
        alertsRange = [range[0]];
      } else if (!forward && alertsCursor) {
        alertsRange = [range[0], alertsCursor];
      } else {
        alertsRange = range;
      }

      // A forward page starts at its cursor, so it also covers the alerts between its cursor and its first
      // event. That gap only exists when Session View opens from an alert. It has its own query so that its
      // alerts cannot take the result slots of the alerts inside the page.
      if (forward && alertsCursor && cursorTime < new Date(range[0]).getTime()) {
        gapRange = [alertsCursor, range[0]];
      }
    }

    const gapAlertsBody = gapRange
      ? await searchAlerts(
          alertsClient,
          sessionEntityId,
          ALERTS_PER_PROCESS_EVENTS_PAGE,
          undefined,
          gapRange
        )
      : undefined;

    const alertsBody = await searchAlerts(
      alertsClient,
      sessionEntityId,
      ALERTS_PER_PROCESS_EVENTS_PAGE,
      undefined,
      alertsRange
    );

    const processesWithIOEvents = await searchProcessWithIOEvents(
      client,
      index,
      sessionEntityId,
      range
    );

    events = [
      ...events,
      ...(gapAlertsBody?.events ?? []).map(normalizeToSearchHit),
      ...alertsBody.events.map(normalizeToSearchHit),
      ...processesWithIOEvents.map(normalizeToSearchHit),
    ];
  }

  return {
    total,
    events,
  };
};
