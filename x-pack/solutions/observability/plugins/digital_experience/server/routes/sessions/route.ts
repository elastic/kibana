/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { conflict, forbidden, internal, notFound } from '@hapi/boom';
import type { Logger } from '@kbn/core/server';
import { isResponseError } from '@kbn/es-errors';
import { i18n } from '@kbn/i18n';
import { isoDateTime, lazySchema, z } from '@kbn/zod/v4';
import { DIGITAL_EXPERIENCE_API_PRIVILEGES } from '../../../common/feature';
import {
  SESSIONS_INDEX_PATTERN,
  SESSIONS_SOURCE_INDICES,
  SESSION_SORT_FIELDS,
  type SessionDetailResponse,
  type SessionListResponse,
  type SessionsStatus,
} from '../../../common/sessions';
import { getSession } from '../../sessions/get_session';
import { listSessions } from '../../sessions/list_sessions';
import { enableSessions, getSessionsStatus } from '../../sessions/sessions_setup';
import { SessionsNewerVersionError } from '../../sessions/sessions_newer_version_error';
import { SessionsPrivilegesError } from '../../sessions/sessions_privileges_error';
import { SessionsRestrictedReadError } from '../../sessions/sessions_restricted_read_error';
import { createDigitalExperienceServerRoute } from '../create_digital_experience_server_route';

export const SESSIONS_STATUS_ENDPOINT = 'GET /internal/digital_experience/sessions/status';
export const SESSIONS_ENABLE_ENDPOINT = 'POST /internal/digital_experience/sessions/enable';
export const SESSIONS_LIST_ENDPOINT =
  'GET /internal/digital_experience/applications/{serviceName}/sessions';
export const SESSION_DETAIL_ENDPOINT =
  'GET /internal/digital_experience/applications/{serviceName}/sessions/{sessionId}';

const MAX_PER_PAGE = 100;
const MAX_SERVICE_NAME_LENGTH = 1024;

const NO_ACCESS_MESSAGE = i18n.translate('xpack.digitalExperience.sessions.api.noAccess', {
  defaultMessage:
    'Reading sessions requires the read index privilege on {sessionsIndex}, and on {sourceIndices} for the session timeline.',
  values: {
    sessionsIndex: SESSIONS_INDEX_PATTERN,
    sourceIndices: SESSIONS_SOURCE_INDICES.join(', '),
  },
});

const LOAD_FAILED_MESSAGE = i18n.translate('xpack.digitalExperience.sessions.api.loadFailed', {
  defaultMessage: 'Could not load the sessions. Check the Kibana server logs for details.',
});

const ENABLE_FAILED_MESSAGE = i18n.translate('xpack.digitalExperience.sessions.api.enableFailed', {
  defaultMessage: 'Could not enable sessions. Check the Kibana server logs for details.',
});

const sessionNotFoundMessage = (sessionId: string) =>
  i18n.translate('xpack.digitalExperience.sessions.api.sessionNotFound', {
    defaultMessage: 'Session [{sessionId}] not found',
    values: { sessionId },
  });

const messageOf = (error: unknown): string =>
  error instanceof Error ? error.message : String(error);

/**
 * Maps a read failure to a client error: an Elasticsearch 403 names the index privileges the
 * reads need; anything else is logged and hidden, as Elasticsearch details name users and indices.
 */
const toReadError = (error: unknown, logger: Logger, what: string) => {
  if (isResponseError(error) && error.statusCode === 403) {
    return forbidden(NO_ACCESS_MESSAGE);
  }
  logger.error(`Could not load ${what}: ${messageOf(error)}`);
  return internal(LOAD_FAILED_MESSAGE);
};

/** Maps an enable failure to a client error; the setup errors explain themselves. */
const toEnableError = (error: unknown, logger: Logger) => {
  if (error instanceof SessionsPrivilegesError) {
    return forbidden(error.message, { missingPrivileges: error.missingPrivileges });
  }
  if (error instanceof SessionsRestrictedReadError) {
    return forbidden(error.message, {
      restrictedIndices: error.restrictedIndices,
      reason: error.reason,
    });
  }
  if (error instanceof SessionsNewerVersionError) {
    return conflict(error.message, {
      installedVersion: error.installedVersion,
      currentVersion: error.currentVersion,
    });
  }
  logger.error(`Could not enable sessions: ${messageOf(error)}`);
  return internal(ENABLE_FAILED_MESSAGE);
};

/** Status without who enabled sessions or whose access the transforms run with. */
const withoutEnabler = (status: SessionsStatus): SessionsStatus => ({
  ...status,
  enabledBy: null,
  enabledAt: null,
  authorization: null,
  transforms: status.transforms.map((transform) => ({
    ...transform,
    enabledBy: null,
    enabledAt: null,
    authorization: null,
  })),
});

const statusRoute = createDigitalExperienceServerRoute({
  endpoint: SESSIONS_STATUS_ENDPOINT,
  options: { access: 'internal' },
  security: {
    authz: {
      requiredPrivileges: [DIGITAL_EXPERIENCE_API_PRIVILEGES.read],
      // Only users who can set sessions up also see who did, and whose access the transforms use.
      extendedPrivileges: [DIGITAL_EXPERIENCE_API_PRIVILEGES.manageSessions],
    },
  },
  handler: async ({ context, request, sessionsSettings, logger }): Promise<SessionsStatus> => {
    const { elasticsearch } = await context.core;
    try {
      // Transform metadata only; no session data is read with the internal user.
      const status = await getSessionsStatus(elasticsearch.client.asInternalUser, {
        settings: sessionsSettings,
      });
      const canManage =
        request.authzResult?.[DIGITAL_EXPERIENCE_API_PRIVILEGES.manageSessions] === true;
      return canManage ? status : withoutEnabler(status);
    } catch (error) {
      logger.error(`Could not read the sessions status: ${messageOf(error)}`);
      throw internal(LOAD_FAILED_MESSAGE);
    }
  },
});

const enableRoute = createDigitalExperienceServerRoute({
  endpoint: SESSIONS_ENABLE_ENDPOINT,
  options: { access: 'internal' },
  security: {
    authz: { requiredPrivileges: [DIGITAL_EXPERIENCE_API_PRIVILEGES.manageSessions] },
  },
  handler: async ({ context, sessionsSettings, logger }): Promise<SessionsStatus> => {
    const { elasticsearch, security } = await context.core;
    const enabledBy = security.authc.getCurrentUser()?.username ?? null;
    const audit = (outcome: 'success' | 'failure', error?: Error) =>
      security.audit.logger.log({
        message:
          outcome === 'success'
            ? `User [${enabledBy}] enabled Digital Experience sessions`
            : `Failed attempt by user [${enabledBy}] to enable Digital Experience sessions`,
        event: {
          action: 'digital_experience_sessions_enable',
          category: ['configuration'],
          type: ['change'],
          outcome,
        },
        ...(error ? { error: { code: error.name, message: error.message } } : {}),
      });

    try {
      await enableSessions({
        esClient: elasticsearch.client,
        logger,
        settings: sessionsSettings,
        enabledBy,
      });
    } catch (error) {
      audit('failure', error);
      throw toEnableError(error, logger);
    }
    audit('success');
    logger.info(`Sessions enabled by [${enabledBy}]`);
    try {
      return await getSessionsStatus(elasticsearch.client.asInternalUser, {
        settings: sessionsSettings,
      });
    } catch (error) {
      throw toReadError(error, logger, 'the sessions status');
    }
  },
});

const serviceName = () => z.string().min(1).max(MAX_SERVICE_NAME_LENGTH);
const facetValue = (maxLength: number) => z.string().min(1).max(maxLength).optional();

const listRoute = createDigitalExperienceServerRoute({
  endpoint: SESSIONS_LIST_ENDPOINT,
  options: { access: 'internal' },
  security: { authz: { requiredPrivileges: [DIGITAL_EXPERIENCE_API_PRIVILEGES.read] } },
  params: lazySchema(() =>
    z.object({
      path: z.object({ serviceName: serviceName() }),
      query: z
        .object({
          start: isoDateTime(),
          end: isoDateTime(),
          query: z.string().max(256).optional(),
          browser: facetValue(256),
          os: facetValue(256),
          country: facetValue(16),
          entryPage: facetValue(1024),
          sortField: z.enum(SESSION_SORT_FIELDS).default('start_time'),
          sortDirection: z.enum(['asc', 'desc']).default('desc'),
          page: z.coerce.number().int().min(0).max(1000).default(0),
          perPage: z.coerce.number().int().min(1).max(MAX_PER_PAGE).default(25),
        })
        .refine(({ start, end }) => Date.parse(start) < Date.parse(end), {
          message: '`start` must be before `end`',
          path: ['end'],
        }),
    })
  ),
  handler: async ({ context, params, logger }): Promise<SessionListResponse> => {
    const { elasticsearch } = await context.core;
    const { browser, os, country, entryPage, ...query } = params.query;
    try {
      return await listSessions(elasticsearch.client.asCurrentUser, {
        ...query,
        serviceName: params.path.serviceName,
        facets: { browsers: browser, os, countries: country, entryPages: entryPage },
      });
    } catch (error) {
      throw toReadError(error, logger, 'the sessions list');
    }
  },
});

const detailRoute = createDigitalExperienceServerRoute({
  endpoint: SESSION_DETAIL_ENDPOINT,
  options: { access: 'internal' },
  security: { authz: { requiredPrivileges: [DIGITAL_EXPERIENCE_API_PRIVILEGES.read] } },
  params: lazySchema(() =>
    z.object({
      path: z.object({ serviceName: serviceName(), sessionId: z.string().min(1).max(256) }),
    })
  ),
  handler: async ({ context, params, logger }): Promise<SessionDetailResponse> => {
    const { elasticsearch } = await context.core;
    let session: SessionDetailResponse | null;
    try {
      session = await getSession(elasticsearch.client.asCurrentUser, params.path);
    } catch (error) {
      throw toReadError(error, logger, `session [${params.path.sessionId}]`);
    }
    if (!session) {
      throw notFound(sessionNotFoundMessage(params.path.sessionId));
    }
    return session;
  },
});

/** The sessions routes, keyed by endpoint; `plugin.ts` registers them. */
export const sessionsRouteRepository = {
  ...statusRoute,
  ...enableRoute,
  ...listRoute,
  ...detailRoute,
};
