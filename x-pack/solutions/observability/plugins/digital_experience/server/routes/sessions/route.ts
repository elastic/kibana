/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { forbidden, internal, notFound } from '@hapi/boom';
import type { Logger } from '@kbn/core/server';
import { isResponseError } from '@kbn/es-errors';
import { i18n } from '@kbn/i18n';
import { isoDateTime, lazySchema, z } from '@kbn/zod/v4';
import { DIGITAL_EXPERIENCE_API_PRIVILEGES } from '../../../common/feature';
import {
  SESSIONS_INDEX_PATTERN,
  SESSIONS_LIST_DEFAULT_PER_PAGE,
  SESSIONS_LIST_MAX_DURATION_MS,
  SESSIONS_LIST_MAX_FACET_LENGTHS,
  SESSIONS_LIST_MAX_PAGE,
  SESSIONS_LIST_MAX_PER_PAGE,
  SESSIONS_LIST_MAX_SEARCH_LENGTH,
  SESSIONS_SOURCE_INDICES,
  SESSION_SORT_FIELDS,
  type SessionDetailResponse,
  type SessionListResponse,
  type SessionsStatus,
} from '../../../common/sessions';
import {
  NO_ENCRYPTION_KEY_MESSAGE,
  SessionsEnableError,
  enableSessions,
  type SessionsEnableStep,
} from '../../services/sessions/enable_sessions';
import { SessionsPrivilegesError } from '../../services/sessions/sessions_privileges_error';
import { SessionsRestrictedReadError } from '../../services/sessions/sessions_restricted_read_error';
import { getSessionsStatus } from '../../services/sessions/sessions_status';
import { MAX_ENVIRONMENT_LENGTH } from '../../lib/constants';
import { describeError } from '../../lib/helpers/errors';
import { createDigitalExperienceServerRoute } from '../create_digital_experience_server_route';
import { getSession } from './get_session';
import { listSessions } from './list_sessions';

export const SESSIONS_STATUS_ENDPOINT = 'GET /internal/digital_experience/sessions/status';
export const SESSIONS_ENABLE_ENDPOINT = 'POST /internal/digital_experience/sessions/enable';
export const SESSIONS_LIST_ENDPOINT =
  'GET /internal/digital_experience/applications/{serviceName}/sessions';
export const SESSION_DETAIL_ENDPOINT =
  'GET /internal/digital_experience/applications/{serviceName}/sessions/{sessionId}';

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

const NO_TASK_MANAGER_MESSAGE = i18n.translate(
  'xpack.digitalExperience.sessions.api.noTaskManager',
  {
    defaultMessage:
      'Sessions need the Task Manager plugin, which builds the session summaries in the background.',
  }
);

const ENABLE_STEP_FAILED_MESSAGES: Record<SessionsEnableStep, string> = {
  credentials: NO_ENCRYPTION_KEY_MESSAGE,
  template: i18n.translate('xpack.digitalExperience.sessions.api.enableFailed.template', {
    defaultMessage:
      'Could not enable sessions: putting the sessions index template failed. Check the Kibana server logs for details, then try again.',
  }),
  index: i18n.translate('xpack.digitalExperience.sessions.api.enableFailed.index', {
    defaultMessage:
      'Could not enable sessions: creating the sessions index failed. Check the Kibana server logs for details, then try again.',
  }),
  task: i18n.translate('xpack.digitalExperience.sessions.api.enableFailed.task', {
    defaultMessage:
      'Could not enable sessions: scheduling the summaries task with an API key on your behalf failed. Check the Kibana server logs for details, then try again.',
  }),
};

const sessionNotFoundMessage = (sessionId: string) =>
  i18n.translate('xpack.digitalExperience.sessions.api.sessionNotFound', {
    defaultMessage: 'Session [{sessionId}] not found',
    values: { sessionId },
  });

/**
 * Maps a read failure to a client error: an Elasticsearch 403 names the index privileges the
 * reads need; anything else is logged and hidden, as Elasticsearch details name users and indices.
 */
const toReadError = (error: unknown, logger: Logger, what: string) => {
  if (isResponseError(error) && error.statusCode === 403) {
    return forbidden(NO_ACCESS_MESSAGE);
  }
  logger.error(`Could not load ${what}: ${describeError(error)}`);
  return internal(LOAD_FAILED_MESSAGE);
};

/**
 * Maps an enable failure to a client error: the privilege checks explain themselves, and a failed
 * step is named, with its details in the logs.
 */
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
  logger.error(`Could not enable sessions: ${describeError(error)}`);
  if (error instanceof SessionsEnableError) {
    return internal(ENABLE_STEP_FAILED_MESSAGES[error.step], { step: error.step });
  }
  return internal(ENABLE_FAILED_MESSAGE);
};

const statusRoute = createDigitalExperienceServerRoute({
  endpoint: SESSIONS_STATUS_ENDPOINT,
  options: { access: 'internal' },
  security: {
    authz: {
      requiredPrivileges: [DIGITAL_EXPERIENCE_API_PRIVILEGES.read],
      // Only users who can set sessions up also see who did, whose access the task runs with.
      extendedPrivileges: [DIGITAL_EXPERIENCE_API_PRIVILEGES.manageSessions],
    },
  },
  handler: async ({
    request,
    sessionsSettings,
    getSessionsServices,
    logger,
  }): Promise<SessionsStatus> => {
    const canManage =
      request.authzResult?.[DIGITAL_EXPERIENCE_API_PRIVILEGES.manageSessions] === true;
    const { taskManager } = await getSessionsServices();
    let status: SessionsStatus;
    try {
      // The task and its state only; no session data is read with the internal user.
      status = await getSessionsStatus({ taskManager, settings: sessionsSettings });
    } catch (error) {
      logger.error(`Could not read the sessions status: ${describeError(error)}`);
      throw internal(LOAD_FAILED_MESSAGE);
    }
    return canManage ? status : { ...status, enabledBy: null };
  },
});

const enableRoute = createDigitalExperienceServerRoute({
  endpoint: SESSIONS_ENABLE_ENDPOINT,
  options: { access: 'internal' },
  security: {
    authz: { requiredPrivileges: [DIGITAL_EXPERIENCE_API_PRIVILEGES.manageSessions] },
  },
  handler: async ({
    context,
    request,
    sessionsSettings,
    getSessionsServices,
    isServerless,
    logger,
  }): Promise<SessionsStatus> => {
    const { elasticsearch, security } = await context.core;
    const { taskManager, canEncrypt } = await getSessionsServices();
    if (!taskManager) {
      throw internal(NO_TASK_MANAGER_MESSAGE);
    }
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
        request,
        taskManager,
        canEncrypt,
        settings: sessionsSettings,
        isServerless,
        logger,
      });
    } catch (error) {
      audit('failure', error);
      throw toEnableError(error, logger);
    }
    audit('success');
    logger.info(`Sessions enabled by [${enabledBy}]`);
    try {
      return await getSessionsStatus({ taskManager, settings: sessionsSettings });
    } catch (error) {
      throw toReadError(error, logger, 'the sessions status');
    }
  },
});

const serviceName = () => z.string().min(1).max(MAX_SERVICE_NAME_LENGTH);
const facetValue = (maxLength: number) => z.string().min(1).max(maxLength).optional();
const durationMs = () =>
  z.coerce.number().int().min(0).max(SESSIONS_LIST_MAX_DURATION_MS).optional();

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
          query: z.string().max(SESSIONS_LIST_MAX_SEARCH_LENGTH).optional(),
          browser: facetValue(SESSIONS_LIST_MAX_FACET_LENGTHS.browser),
          os: facetValue(SESSIONS_LIST_MAX_FACET_LENGTHS.os),
          country: facetValue(SESSIONS_LIST_MAX_FACET_LENGTHS.country),
          entryPage: facetValue(SESSIONS_LIST_MAX_FACET_LENGTHS.entryPage),
          // All environments when left out, as in the applications list.
          environment: z.string().min(1).max(MAX_ENVIRONMENT_LENGTH).optional(),
          withJsErrors: z.stringbool().optional(),
          withFailedRequests: z.stringbool().optional(),
          minDurationMs: durationMs(),
          maxDurationMs: durationMs(),
          sortField: z.enum(SESSION_SORT_FIELDS).default('start_time'),
          sortDirection: z.enum(['asc', 'desc']).default('desc'),
          page: z.coerce.number().int().min(0).max(SESSIONS_LIST_MAX_PAGE).default(0),
          perPage: z.coerce
            .number()
            .int()
            .min(1)
            .max(SESSIONS_LIST_MAX_PER_PAGE)
            .default(SESSIONS_LIST_DEFAULT_PER_PAGE),
        })
        .refine(({ start, end }) => Date.parse(start) < Date.parse(end), {
          message: '`start` must be before `end`',
          path: ['end'],
        })
        .refine(
          ({ minDurationMs, maxDurationMs }) =>
            minDurationMs === undefined ||
            maxDurationMs === undefined ||
            minDurationMs < maxDurationMs,
          { message: '`minDurationMs` must be below `maxDurationMs`', path: ['maxDurationMs'] }
        ),
    })
  ),
  handler: async ({ context, params, logger }): Promise<SessionListResponse> => {
    const { elasticsearch } = await context.core;
    const {
      browser,
      os,
      country,
      entryPage,
      withJsErrors,
      withFailedRequests,
      minDurationMs,
      maxDurationMs,
      ...query
    } = params.query;
    try {
      return await listSessions(elasticsearch.client.asCurrentUser, {
        ...query,
        serviceName: params.path.serviceName,
        facets: { browsers: browser, os, countries: country, entryPages: entryPage },
        filters: { withJsErrors, withFailedRequests, minDurationMs, maxDurationMs },
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
