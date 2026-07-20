/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { schema } from '@kbn/config-schema';
import { transformError } from '@kbn/securitysolution-es-utils';
import type { IRouter, Logger } from '@kbn/core/server';
import type {
  AlertsClient,
  RuleRegistryPluginStartContract,
} from '@kbn/rule-registry-plugin/server';
import { SECURITY_SOLUTION_RULE_TYPE_IDS } from '@kbn/securitysolution-rules';
import type { SearchHit } from '@kbn/es-types';
import type { ProcessEvent } from '../../common';
import {
  ALERTS_ROUTE,
  ALERTS_PER_PAGE,
  ENTRY_SESSION_ENTITY_ID_PROPERTY,
  ALERT_UUID_PROPERTY,
  ALERT_ORIGINAL_TIME_PROPERTY,
  PREVIEW_ALERTS_INDEX,
  ALERT_FIELDS,
} from '../../common/constants';

import { expandDottedObject } from '../../common/utils/expand_dotted_object';
import { normalizeEventProcessArgs } from '../../common/utils/process_args_normalizer';

// Session entity IDs are compound identifiers (process.entry_leader.entity_id
// format). All observed values are under 128 chars; 1024 is a safe ceiling.
const SESSION_ENTITY_ID_MAX_LENGTH = 1024;

// ISO 8601 timestamp strings for session start time.
// Millisecond-precision ISO is 24 chars; 100 covers all valid forms.
const SESSION_TIMESTAMP_MAX_LENGTH = 100;

// Alert UUIDs are Kibana-generated UUID v4 (36 chars). 64 covers all UUID
// variants with headroom.
const ALERT_UUID_MAX_LENGTH = 64;

// Pagination cursor: an opaque Base64-encoded sort value from ES search_after.
// 1024 is a conservative ceiling for encoded sort keys.
const CURSOR_MAX_LENGTH = 1024;

export const registerAlertsRoute = (
  router: IRouter,
  logger: Logger,
  ruleRegistry: RuleRegistryPluginStartContract
) => {
  router.versioned
    .get({
      access: 'internal',
      path: ALERTS_ROUTE,
      security: {
        authz: {
          requiredPrivileges: ['securitySolution'],
        },
      },
    })
    .addVersion(
      {
        version: '1',
        validate: {
          request: {
            query: schema.object({
              sessionEntityId: schema.string({ maxLength: SESSION_ENTITY_ID_MAX_LENGTH }),
              sessionStartTime: schema.string({ maxLength: SESSION_TIMESTAMP_MAX_LENGTH }),
              investigatedAlertId: schema.maybe(
                schema.string({ maxLength: ALERT_UUID_MAX_LENGTH })
              ),
              cursor: schema.maybe(schema.string({ maxLength: CURSOR_MAX_LENGTH })),
            }),
          },
        },
      },
      async (_context, request, response) => {
        const client = await ruleRegistry.getRacClientWithRequest(request);
        const { sessionEntityId, sessionStartTime, investigatedAlertId, cursor } = request.query;

        try {
          const body = await searchAlerts(
            client,
            sessionEntityId,
            ALERTS_PER_PAGE,
            investigatedAlertId,
            [sessionStartTime],
            cursor
          );

          return response.ok({ body });
        } catch (err) {
          const error = transformError(err);
          logger.error(`Failed to fetch alerts: ${err}`);

          return response.customError({
            body: { message: error.message },
            statusCode: error.statusCode,
          });
        }
      }
    );
};

export const searchAlerts = async (
  client: AlertsClient,
  sessionEntityId: string,
  size: number,
  investigatedAlertId?: string,
  range?: string[],
  cursor?: string
) => {
  const indices = (
    await client.getAuthorizedAlertsIndices(SECURITY_SOLUTION_RULE_TYPE_IDS)
  )?.filter((index) => index !== PREVIEW_ALERTS_INDEX);

  if (!indices) {
    return { events: [] };
  }

  try {
    const results = await client.find({
      query: {
        bool: {
          must: [
            {
              term: {
                [ENTRY_SESSION_ENTITY_ID_PROPERTY]: sessionEntityId,
              },
            },
            range && {
              range: {
                [ALERT_ORIGINAL_TIME_PROPERTY]: {
                  gte: range[0],
                  lte: range[1],
                },
              },
            },
          ].filter((item) => !!item),
        },
      },
      track_total_hits: true,
      size,
      index: indices.join(','),
      sort: [{ '@timestamp': 'asc' }],
      search_after: cursor ? [cursor] : undefined,
      _source: ALERT_FIELDS,
    });

    // if an alert is being investigated, fetch it on it's own, as it's not guaranteed to come back in the above request.
    // we only need to do this for the first page of alerts.
    if (!cursor && investigatedAlertId) {
      const investigatedAlertSearch = await client.find({
        _source: ALERT_FIELDS,
        query: {
          match: {
            [ALERT_UUID_PROPERTY]: investigatedAlertId,
          },
        },
        size: 1,
        index: indices.join(','),
      });

      if (investigatedAlertSearch.hits.hits.length > 0) {
        results.hits.hits.unshift(investigatedAlertSearch.hits.hits[0]);
      }
    }

    const events = results.hits.hits.map((hit) => {
      const typedHit = hit as SearchHit<ProcessEvent>;
      // the alert indexes flattens many properties. this util unflattens them as session view expects structured json.
      typedHit._source = expandDottedObject(typedHit._source);
      // normalize args fields to ensure consistent array structure
      typedHit._source = normalizeEventProcessArgs(typedHit._source);
      return typedHit;
    });

    const total =
      typeof results.hits.total === 'number' ? results.hits.total : results.hits.total?.value;

    return { total, events };
  } catch (err) {
    // unauthorized
    if (err.output.statusCode === 404) {
      return { total: 0, events: [] };
    }

    throw err;
  }
};
