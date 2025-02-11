/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { schema } from '@kbn/config-schema';
import { transformError } from '@kbn/securitysolution-es-utils';
import { IRouter, Logger } from '@kbn/core/server';
import { EVENT_ACTION, TIMESTAMP } from '@kbn/rule-data-utils';
import type { ElasticsearchClient } from '@kbn/core/server';
import type { Aggregate } from '../../common';
import {
  IO_EVENTS_ROUTE,
  IO_EVENTS_PER_PAGE,
  ENTRY_SESSION_ENTITY_ID_PROPERTY,
  TIMESTAMP_PROPERTY,
  PROCESS_ENTITY_ID_PROPERTY,
  PROCESS_EVENTS_PER_PAGE,
  IO_EVENT_FIELDS,
} from '../../common/constants';

export const registerIOEventsRoute = (router: IRouter, logger: Logger) => {
  router.versioned
    .get({
      access: 'internal',
      path: IO_EVENTS_ROUTE,
    })
    .addVersion(
      {
        version: '1',
        security: {
          authz: {
            enabled: false,
            reason: `This route delegates authorization to Elasticsearch and it's not tied to a Kibana privilege.`,
          },
        },
        validate: {
          request: {
            query: schema.object({
              index: schema.string(),
              sessionEntityId: schema.string(),
              sessionStartTime: schema.string(),
              cursor: schema.maybe(schema.string()),
              pageSize: schema.maybe(schema.number({ min: 1, max: IO_EVENTS_PER_PAGE })), // currently only set in FTR tests to test pagination
            }),
          },
        },
      },
      async (context, request, response) => {
        const client = (await context.core).elasticsearch.client.asCurrentUser;
        const {
          index,
          sessionEntityId,
          sessionStartTime,
          cursor,
          pageSize = IO_EVENTS_PER_PAGE,
        } = request.query;

        try {
          const search = await client.search({
            index: [index],
            body: {
              query: {
                bool: {
                  must: [
                    { term: { [ENTRY_SESSION_ENTITY_ID_PROPERTY]: sessionEntityId } },
                    { term: { [EVENT_ACTION]: 'text_output' } },
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
              size: Math.min(pageSize, IO_EVENTS_PER_PAGE),
              sort: [{ [TIMESTAMP]: 'asc' }],
              search_after: cursor ? [cursor] : undefined,
              fields: IO_EVENT_FIELDS,
            },
          });

          const events = search.hits.hits;
          const total =
            typeof search.hits.total === 'number' ? search.hits.total : search.hits.total?.value;

          return response.ok({ body: { total, events } });
        } catch (err) {
          const error = transformError(err);
          logger.error(`Failed to fetch io events: ${err}`);

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

export const searchProcessWithIOEvents = async (
  client: ElasticsearchClient,
  index: string,
  sessionEntityId: string,
  range?: string[]
) => {
  const rangeFilter = range
    ? [
        {
          range: {
            [TIMESTAMP]: {
              gte: range[0],
              lte: range[1],
            },
          },
        },
      ]
    : [];

  try {
    const search = await client.search({
      index: [index],
      body: {
        query: {
          bool: {
            must: [
              { term: { [EVENT_ACTION]: 'text_output' } },
              { term: { [ENTRY_SESSION_ENTITY_ID_PROPERTY]: sessionEntityId } },
              ...rangeFilter,
            ],
          },
        },
        size: 0,
        aggs: {
          custom_agg: {
            terms: {
              field: PROCESS_ENTITY_ID_PROPERTY,
              size: PROCESS_EVENTS_PER_PAGE,
            },
          },
        },
      },
    });

    const agg: any = search.aggregations?.custom_agg;
    const buckets: Aggregate[] = agg?.buckets || [];

    return buckets.map((bucket) => ({
      _source: {
        event: {
          kind: 'event',
          action: 'text_output',
          id: bucket.key,
        },
        process: {
          entity_id: bucket.key,
        },
      },
    }));
  } catch (err) {
    return [];
  }
};
