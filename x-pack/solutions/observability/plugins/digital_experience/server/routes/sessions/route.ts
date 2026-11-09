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
import { getSession } from '../../sessions/get_session';
import { listSessions } from '../../sessions/list_sessions';
import { enableSessionsForUser, withApiKeyStatus } from '../../sessions/sessions_auto_update';
import { getSessionsStatus } from '../../sessions/sessions_setup';
import { SessionsNewerVersionError } from '../../sessions/sessions_newer_version_error';
import { SessionsPrivilegesError } from '../../sessions/sessions_privileges_error';
import { SessionsRestrictedReadError } from '../../sessions/sessions_restricted_read_error';
import { describeError } from '../../lib/helpers/errors';
import { createDigitalExperienceServerRoute } from '../create_digital_experience_server_route';

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
  logger.error(`Could not enable sessions: ${describeError(error)}`);
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
  handler: async ({
    context,
    request,
    sessionsSettings,
    sessionsApiKeys,
    getSessionsAutoUpdateState,
    logger,
  }): Promise<SessionsStatus> => {
    const { elasticsearch } = await context.core;
    const canManage =
      request.authzResult?.[DIGITAL_EXPERIENCE_API_PRIVILEGES.manageSessions] === true;
    let status: SessionsStatus;
    try {
      // Transform metadata only; no session data is read with the internal user.
      status = await getSessionsStatus(elasticsearch.client.asInternalUser, {
        settings: sessionsSettings,
      });
    } catch (error) {
      logger.error(`Could not read the sessions status: ${describeError(error)}`);
      throw internal(LOAD_FAILED_MESSAGE);
    }
    // Only users who can grant a new key act on a deleted one, so only they pay for checking it;
    // the others see what the health task found.
    const withKey = await withApiKeyStatus(status, sessionsApiKeys, {
      checkKey: canManage,
      logger,
      getAutoUpdateState: getSessionsAutoUpdateState,
    });
    return canManage ? withKey : withoutEnabler(withKey);
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
    sessionsApiKeys,
    logger,
  }): Promise<SessionsStatus> => {
    const { elasticsearch, security } = await context.core;
    const enabledBy = security.authc.getCurrentUser()?.username ?? null;
    const audit = (outcome: 'success' | 'failure', error?: Error, apiKeyRef?: string) =>
      security.audit.logger.log({
        message:
          outcome === 'success'
            ? `User [${enabledBy}] enabled Digital Experience sessions${
                apiKeyRef ? ` with a new API key ${apiKeyRef}` : ''
              }`
            : `Failed attempt by user [${enabledBy}] to enable Digital Experience sessions`,
        event: {
          action: 'digital_experience_sessions_enable',
          category: ['configuration'],
          type: ['change'],
          outcome,
        },
        ...(error ? { error: { code: error.name, message: error.message } } : {}),
      });

    let apiKeyRef: string | undefined;
    try {
      const apiKey = await enableSessionsForUser({
        esClient: elasticsearch.client,
        apiKeys: sessionsApiKeys,
        request,
        logger,
        settings: sessionsSettings,
        enabledBy,
      });
      // Every key has the same name, so the id tells them apart.
      apiKeyRef = apiKey ? `[${apiKey.name}] (${apiKey.id})` : undefined;
    } catch (error) {
      audit('failure', error);
      throw toEnableError(error, logger);
    }
    audit('success', undefined, apiKeyRef);
    logger.info(
      `Sessions enabled by [${enabledBy}]${apiKeyRef ? ` with API key ${apiKeyRef}` : ''}`
    );
    try {
      return await withApiKeyStatus(
        await getSessionsStatus(elasticsearch.client.asInternalUser, {
          settings: sessionsSettings,
        }),
        sessionsApiKeys,
        { checkKey: true, logger }
      );
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
          hasErrors: z.stringbool().optional(),
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
    const { browser, os, country, entryPage, hasErrors, minDurationMs, maxDurationMs, ...query } =
      params.query;
    try {
      return await listSessions(elasticsearch.client.asCurrentUser, {
        ...query,
        serviceName: params.path.serviceName,
        facets: { browsers: browser, os, countries: country, entryPages: entryPage },
        filters: { hasErrors, minDurationMs, maxDurationMs },
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
