/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema, type Type } from '@kbn/config-schema';
import type { IKibanaResponse, IRouter, KibanaResponseFactory, Logger } from '@kbn/core/server';
import { isResponseError } from '@kbn/es-errors';
import { DIGITAL_EXPERIENCE_API_PRIVILEGES } from '../../common/feature';
import {
  SESSIONS_INDEX_PATTERN,
  SESSIONS_SOURCE_INDICES,
  SESSION_SORT_FIELDS,
  type SessionSortField,
  type SessionsSettings,
} from '../../common/sessions';
import { getSession } from '../sessions/get_session';
import { listSessions } from '../sessions/list_sessions';
import {
  SessionsPrivilegesError,
  enableSessions,
  getSessionsStatus,
} from '../sessions/sessions_setup';

export const SESSIONS_API_BASE_PATH = '/internal/digital_experience';

const MAX_PER_PAGE = 100;

const boundedString = (maxLength: number) => schema.string({ minLength: 1, maxLength });

const ISO_DATE_TIME = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d{1,9})?)?(Z|[+-]\d{2}:\d{2})$/;

/** An ISO 8601 date-time; date math such as `now-15m` is resolved by the browser. */
const isoDateTime = () =>
  schema.string({
    maxLength: 64,
    validate: (value) =>
      ISO_DATE_TIME.test(value) && Number.isFinite(Date.parse(value))
        ? undefined
        : 'must be an ISO 8601 date-time',
  });

const sortFieldSchema = schema.oneOf<SessionSortField>(
  SESSION_SORT_FIELDS.map((field) => schema.literal(field)) as [Type<SessionSortField>],
  { defaultValue: 'start_time' }
);

const NO_SESSIONS_ACCESS_MESSAGE = `Reading sessions requires the read index privilege on ${SESSIONS_INDEX_PATTERN}, and on ${SESSIONS_SOURCE_INDICES.join(
  ', '
)} for the session timeline.`;

/** Maps an Elasticsearch 403 (missing index privileges) to a 403 naming them, not a 500. */
const withSessionsAccess = async (
  response: KibanaResponseFactory,
  handler: () => Promise<IKibanaResponse>
): Promise<IKibanaResponse> => {
  try {
    return await handler();
  } catch (error) {
    if (isResponseError(error) && error.statusCode === 403) {
      return response.forbidden({ body: { message: NO_SESSIONS_ACCESS_MESSAGE } });
    }
    throw error;
  }
};

const readSecurity = {
  authz: { requiredPrivileges: [DIGITAL_EXPERIENCE_API_PRIVILEGES.read] },
};
const manageSecurity = {
  authz: { requiredPrivileges: [DIGITAL_EXPERIENCE_API_PRIVILEGES.manageSessions] },
};

const serviceParams = schema.object({ serviceName: boundedString(1024) });

export const registerSessionsRoutes = ({
  router,
  logger,
  settings,
}: {
  router: IRouter;
  logger: Logger;
  settings: SessionsSettings;
}): void => {
  router.get(
    {
      path: `${SESSIONS_API_BASE_PATH}/sessions/status`,
      security: readSecurity,
      options: { access: 'internal' },
      validate: false,
    },
    async (context, _request, response) => {
      const { elasticsearch } = await context.core;
      // Transform metadata only; no session data is read with the internal user.
      const status = await getSessionsStatus(elasticsearch.client.asInternalUser, { settings });
      return response.ok({ body: status });
    }
  );

  router.post(
    {
      path: `${SESSIONS_API_BASE_PATH}/sessions/enable`,
      security: manageSecurity,
      options: { access: 'internal' },
      validate: false,
    },
    async (context, _request, response) => {
      const { elasticsearch } = await context.core;
      try {
        await enableSessions({ esClient: elasticsearch.client, logger, settings });
      } catch (error) {
        if (error instanceof SessionsPrivilegesError) {
          return response.forbidden({
            body: {
              message: error.message,
              attributes: { missingPrivileges: error.missingPrivileges },
            },
          });
        }
        throw error;
      }
      const status = await getSessionsStatus(elasticsearch.client.asInternalUser, { settings });
      return response.ok({ body: status });
    }
  );

  router.get(
    {
      path: `${SESSIONS_API_BASE_PATH}/applications/{serviceName}/sessions`,
      security: readSecurity,
      options: { access: 'internal' },
      validate: {
        params: serviceParams,
        query: schema.object(
          {
            start: isoDateTime(),
            end: isoDateTime(),
            query: schema.maybe(schema.string({ maxLength: 256 })),
            browser: schema.maybe(boundedString(256)),
            os: schema.maybe(boundedString(256)),
            country: schema.maybe(boundedString(16)),
            entryPage: schema.maybe(boundedString(1024)),
            sortField: sortFieldSchema,
            sortDirection: schema.oneOf([schema.literal('asc'), schema.literal('desc')], {
              defaultValue: 'desc',
            }),
            page: schema.number({ min: 0, max: 1000, defaultValue: 0 }),
            perPage: schema.number({ min: 1, max: MAX_PER_PAGE, defaultValue: 25 }),
          },
          {
            validate: ({ start, end }) =>
              Date.parse(start) < Date.parse(end) ? undefined : '`start` must be before `end`',
          }
        ),
      },
    },
    async (context, request, response) => {
      const { elasticsearch } = await context.core;
      const { browser, os, country, entryPage, ...query } = request.query;
      return withSessionsAccess(response, async () => {
        const body = await listSessions(elasticsearch.client.asCurrentUser, {
          ...query,
          serviceName: request.params.serviceName,
          facets: { browsers: browser, os, countries: country, entryPages: entryPage },
        });
        return response.ok({ body });
      });
    }
  );

  router.get(
    {
      path: `${SESSIONS_API_BASE_PATH}/applications/{serviceName}/sessions/{sessionId}`,
      security: readSecurity,
      options: { access: 'internal' },
      validate: {
        params: schema.object({
          serviceName: boundedString(1024),
          sessionId: boundedString(256),
        }),
      },
    },
    async (context, request, response) => {
      const { elasticsearch } = await context.core;
      return withSessionsAccess(response, async () => {
        const body = await getSession(elasticsearch.client.asCurrentUser, request.params);
        if (!body) {
          return response.notFound({
            body: { message: `Session [${request.params.sessionId}] not found` },
          });
        }
        return response.ok({ body });
      });
    }
  );
};
