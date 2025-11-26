/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  IKibanaResponse,
  KibanaResponseFactory,
  Logger,
  RequestHandler,
} from '@kbn/core/server';
import { transformError } from '@kbn/securitysolution-es-utils';
import { buildSiemResponse } from '@kbn/lists-plugin/server/routes';
import type { TypeOf } from '@kbn/config-schema';
import { schema } from '@kbn/config-schema';
import { type Either, left, match, right } from 'fp-ts/Either';
import { pipe } from 'fp-ts/function';
import type { TrialCompanionUserNBAService } from '../services/trial_companion_user_nba_service.types';
import { TRIAL_COMPANION_NBA_URL } from '../../../../common/trial_companion/constants';
import type {
  SecuritySolutionPluginRouter,
  SecuritySolutionRequestHandlerContext,
} from '../../../types';
import { TrialCompanionUserNBAServiceImpl } from '../services/trial_companion_user_nba_service';

// TODO: think about dependency injection of saved objects (internal) client. Currently, we get it from context.core.savedObjects
// TODO: if we need internal client - add user milestone service in x-pack/solutions/security/plugins/security_solution/server/request_context_factory.ts
// TODO: and get it from request context

interface NBAContext {
  nbaService: TrialCompanionUserNBAService;
  username: string;
}

const NBARouteSchema = {
  body: schema.object({
    milestoneId: schema.number(), // TODO: oneOf plus iterate over ALL_NBA keys
  }),
};

type NBASeenRouteRequestBody = TypeOf<typeof NBARouteSchema.body>;

export const registerGetNBARoute = (router: SecuritySolutionPluginRouter, logger: Logger) => {
  router.versioned
    .get({
      path: TRIAL_COMPANION_NBA_URL,
      access: 'internal',
      summary: 'Get Trial Companion NBA for a user',
      options: {
        tags: ['api'],
      },
      security: {
        authz: {
          requiredPrivileges: ['securitySolution'],
        },
      },
    })
    .addVersion(
      {
        version: '1',
        validate: false, // TODO: help needed here - do we need to validate something?
      },
      getCurrentNBAForUser(logger)
    );
};

export const registerPostNBASeenRoute = (router: SecuritySolutionPluginRouter, logger: Logger) => {
  router.versioned
    .post({
      path: TRIAL_COMPANION_NBA_URL,
      access: 'internal',
      summary: 'Save Trial Companion NBA seen action (aka dismiss)',
      options: {
        tags: ['api'],
      },
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
          request: NBARouteSchema,
        },
      },
      postNBAUserSeen(logger)
    );
};

export const registerPostNBAActionRoute = (
  router: SecuritySolutionPluginRouter,
  logger: Logger
) => {
  // TODO: TBD - use TRIAL_COMPANION_NBA_ACTION_URL
};

const postNBAUserSeen =
  (
    logger: Logger
  ): RequestHandler<never, never, NBASeenRouteRequestBody, SecuritySolutionRequestHandlerContext> =>
  async (context, request, response) => {
    const siemResponse = buildSiemResponse(response);
    const { milestoneId } = request.body;
    try {
      logger.info(
        `POST Trial Companion NBA seen route called. milestoneId: ${milestoneId}, body: ${JSON.stringify(
          request.body
        )}`
      );

      const nbaContextOrResponse: Either<IKibanaResponse, NBAContext> = await getNBAContext(
        logger,
        context,
        response
      );
      return pipe(
        nbaContextOrResponse,
        match(
          async (e: IKibanaResponse) => e,
          async (s: NBAContext) => {
            await s.nbaService.markAsSeen(milestoneId, s.username);
            return response.ok({});
          }
        )
      );
    } catch (err) {
      logger.error(`Post Trial Companion NBA seen route: Caught error: ${err}`);
      const error = transformError(err);
      return siemResponse.error({
        body: error.message,
        statusCode: error.statusCode,
      });
    }
  };

const getCurrentNBAForUser =
  (logger: Logger): RequestHandler<never, never, never, SecuritySolutionRequestHandlerContext> =>
  async (context, request, response) => {
    const siemResponse = buildSiemResponse(response);

    try {
      logger.info('Get Trial Companion NBA route called');
      const nbaContextOrResponse: Either<IKibanaResponse, NBAContext> = await getNBAContext(
        logger,
        context,
        response
      );
      return pipe(
        nbaContextOrResponse,
        match(
          async (e: IKibanaResponse) => e,
          async (s: NBAContext) => {
            const currentMilestoneId = await s.nbaService.nextNBA(s.username);
            if (!currentMilestoneId) {
              return response.ok({});
            }
            return response.ok({
              body: {
                milestoneId: currentMilestoneId,
              },
            });
          }
        )
      );
    } catch (err) {
      logger.error(`Get Trial Companion Notification route: Caught error: ${err}`);
      const error = transformError(err);
      return siemResponse.error({
        body: error.message,
        statusCode: error.statusCode,
      });
    }
  };

async function getNBAContext(
  logger: Logger,
  context: SecuritySolutionRequestHandlerContext,
  response: KibanaResponseFactory
): Promise<Either<IKibanaResponse, NBAContext>> {
  const core = await context.core;
  const currentUser = await core.userProfile.getCurrent();
  const user = currentUser?.user;
  logger.info(
    `User data. Username: ${user?.username}, uid: ${currentUser?.uid}. Profile: ${JSON.stringify(
      user?.roles
    )}`
  );

  if (!user) {
    return left(
      response.notFound({
        body: 'User not found',
      })
    );
  }

  if (!user.roles?.includes('admin')) {
    // TODO: just an experiment
    return left(response.ok({}));
  }

  const nbaService: TrialCompanionUserNBAService = new TrialCompanionUserNBAServiceImpl(
    logger,
    core.savedObjects.getClient()
  );
  return right({
    nbaService,
    username: user.username,
  } as NBAContext);
}
