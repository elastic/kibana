/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { boundedString, schema } from '@kbn/config-schema';
import type { CoreRequestHandlerContext, IRouter, Logger } from '@kbn/core/server';
import { AuthzDisabled } from '@kbn/core-security-server';
import {
  ANALYTICS_APP_API_KEY_PATH,
  getAppApiKeyName,
  getAppApiKeyRoleDescriptors,
} from '../../common/analytics_app_api_key';
import type {
  AnalyticsAppApiKeyAvailability,
  AnalyticsAppApiKeyResult,
  AppApiKeyUnavailableReason,
} from '../../common/analytics_app_api_key';
import {
  MAX_EVENTS_INDEX_NAME_BYTES,
  getEventsIndexNameProblem,
} from '../../common/analytics_events_index';
import { getStatusCode } from './analytics_cluster_state';

const FAILURE_MESSAGE = 'Failed to create the API key';

/** A single index or data stream: a wildcard or a list would widen what the key can read. */
const indexSchema = boundedString({
  minLength: 1,
  maxLength: MAX_EVENTS_INDEX_NAME_BYTES,
  validate: (index) => {
    const problem = getEventsIndexNameProblem(index);
    return problem === undefined
      ? undefined
      : `is not the name of one index or data stream (${problem})`;
  },
});

const UNAVAILABLE: Record<AppApiKeyUnavailableReason, { statusCode: number; message: string }> = {
  apiKeysDisabled: { statusCode: 400, message: 'API keys are disabled in Elasticsearch' },
  missingApiKeyPrivilege: {
    statusCode: 403,
    message: 'your role needs the manage_own_api_key cluster privilege',
  },
  missingReadPrivilege: {
    statusCode: 403,
    message: 'your role needs the read index privilege on the source',
  },
  sourceNotFound: { statusCode: 404, message: 'the source does not exist' },
};

const sourceExists = async (
  { elasticsearch }: CoreRequestHandlerContext,
  index: string
): Promise<boolean> => {
  try {
    // A search needs nothing more than `read`, which is what the key is about to be given.
    await elasticsearch.client.asCurrentUser.search({
      index,
      size: 0,
      track_total_hits: false,
      terminate_after: 1,
    });
    return true;
  } catch (error) {
    if (getStatusCode(error) === 404) {
      return false;
    }
    throw error;
  }
};

const getAvailability = async (
  core: CoreRequestHandlerContext,
  index: string
): Promise<AnalyticsAppApiKeyAvailability> => {
  const { elasticsearch, security } = core;
  const [areApiKeysEnabled, privileges] = await Promise.all([
    security.authc.apiKeys.areAPIKeysEnabled(),
    elasticsearch.client.asCurrentUser.security.hasPrivileges({
      cluster: ['manage_own_api_key'],
      index: [{ names: [index], privileges: ['read'] }],
    }),
  ]);

  if (!areApiKeysEnabled) {
    return { canCreate: false, reason: 'apiKeysDisabled' };
  }
  if (privileges.cluster.manage_own_api_key !== true) {
    return { canCreate: false, reason: 'missingApiKeyPrivilege' };
  }
  if (privileges.index[index]?.read !== true) {
    return { canCreate: false, reason: 'missingReadPrivilege' };
  }
  if (!(await sourceExists(core, index))) {
    return { canCreate: false, reason: 'sourceNotFound' };
  }
  return { canCreate: true };
};

/**
 * Creates an API key that can only read one index or data stream, for the caller's own application.
 * The key belongs to the caller, so Elasticsearch never lets it do more than the caller may.
 */
export const registerAnalyticsAppApiKeyRoutes = (router: IRouter, logger: Logger): void => {
  const security = {
    authz: AuthzDisabled.fromReason(
      'The key is created as the caller: Elasticsearch decides whether they may create it and caps it at their own privileges'
    ),
  };

  router.get(
    {
      path: ANALYTICS_APP_API_KEY_PATH,
      validate: { query: schema.object({ index: indexSchema }) },
      options: { access: 'internal' },
      security,
    },
    async (context, request, response) => {
      try {
        const body = await getAvailability(await context.core, request.query.index);

        return response.ok({ body });
      } catch (error) {
        const message = 'Failed to check whether an API key can be created';
        logger.error(`${message}: ${error.message}`);
        return response.customError({ statusCode: getStatusCode(error), body: { message } });
      }
    }
  );

  router.post(
    {
      path: ANALYTICS_APP_API_KEY_PATH,
      validate: { body: schema.object({ index: indexSchema }) },
      options: { access: 'internal' },
      security,
    },
    async (context, request, response) => {
      const { index } = request.body;
      const refuse = (reason: AppApiKeyUnavailableReason) => {
        const { statusCode, message } = UNAVAILABLE[reason];
        return response.customError({
          statusCode,
          body: { message: `${FAILURE_MESSAGE}: ${message}`, attributes: { reason } },
        });
      };

      try {
        const core = await context.core;
        const availability = await getAvailability(core, index);
        if (!availability.canCreate) {
          return refuse(availability.reason);
        }

        const key = await core.security.authc.apiKeys.create({
          name: getAppApiKeyName(index),
          role_descriptors: getAppApiKeyRoleDescriptors(index),
          metadata: { created_by: 'search_homepage', source: index },
        });
        if (key === null) {
          return refuse('apiKeysDisabled');
        }

        const { id, name, encoded } = key;
        const body: AnalyticsAppApiKeyResult = { id, name, encoded };

        return response.ok({ body });
      } catch (error) {
        const statusCode = getStatusCode(error);
        if (statusCode === 403) {
          logger.debug(`${FAILURE_MESSAGE}, the caller lacks privileges: ${error.message}`);
          return refuse('missingApiKeyPrivilege');
        }
        logger.error(`${FAILURE_MESSAGE}: ${error.message}`);
        return response.customError({ statusCode, body: { message: FAILURE_MESSAGE } });
      }
    }
  );
};
