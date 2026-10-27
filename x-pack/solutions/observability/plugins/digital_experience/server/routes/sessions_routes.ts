/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import type { IRouter, Logger } from '@kbn/core/server';
import { DIGITAL_EXPERIENCE_API_PRIVILEGES } from '../../common/feature';
import type { SessionsSettings } from '../../common/sessions';
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

const readSecurity = {
  authz: { requiredPrivileges: [DIGITAL_EXPERIENCE_API_PRIVILEGES.read] },
};
const manageSecurity = {
  authz: { requiredPrivileges: [DIGITAL_EXPERIENCE_API_PRIVILEGES.manage] },
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
        query: schema.object({
          start: boundedString(64),
          end: boundedString(64),
          query: schema.maybe(schema.string({ maxLength: 256 })),
          browser: schema.maybe(boundedString(256)),
          os: schema.maybe(boundedString(256)),
          country: schema.maybe(boundedString(16)),
          entryPage: schema.maybe(boundedString(1024)),
          sortField: schema.oneOf(
            [
              schema.literal('start_time'),
              schema.literal('duration_ms'),
              schema.literal('page_view_count'),
              schema.literal('click_count'),
              schema.literal('error_count'),
            ],
            { defaultValue: 'start_time' }
          ),
          sortDirection: schema.oneOf([schema.literal('asc'), schema.literal('desc')], {
            defaultValue: 'desc',
          }),
          page: schema.number({ min: 0, max: 1000, defaultValue: 0 }),
          perPage: schema.number({ min: 1, max: MAX_PER_PAGE, defaultValue: 25 }),
        }),
      },
    },
    async (context, request, response) => {
      const { elasticsearch } = await context.core;
      const { browser, os, country, entryPage, ...query } = request.query;
      const body = await listSessions(elasticsearch.client.asCurrentUser, {
        ...query,
        serviceName: request.params.serviceName,
        facets: { browsers: browser, os, countries: country, entryPages: entryPage },
      });
      return response.ok({ body });
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
      const body = await getSession(elasticsearch.client.asCurrentUser, request.params);
      if (!body) {
        return response.notFound({
          body: { message: `Session [${request.params.sessionId}] not found` },
        });
      }
      return response.ok({ body });
    }
  );
};
