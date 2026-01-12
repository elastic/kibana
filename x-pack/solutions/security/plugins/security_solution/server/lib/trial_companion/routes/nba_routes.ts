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
import type { SecuritySolutionRequestHandlerContext } from '../../../types';
import { TrialCompanionUserNBAServiceImpl } from '../services/trial_companion_user_nba_service';
import type { TrialCompanionRoutesDeps } from '../types';

interface NBAContext {
  nbaService: TrialCompanionUserNBAService;
  username: string;
}

const NBARouteSchema = {
  body: schema.object({
    milestoneId: schema.number(),
  }),
};

type NBASeenRouteRequestBody = TypeOf<typeof NBARouteSchema.body>;

export const registerGetNBARoute = ({ router, logger }: TrialCompanionRoutesDeps) => {
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
        validate: false,
      },
      getCurrentNBAForUser(logger)
    );
};

export const registerPostNBASeenRoute = ({ router, logger }: TrialCompanionRoutesDeps) => {
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

const postNBAUserSeen =
  (
    logger: Logger
  ): RequestHandler<never, never, NBASeenRouteRequestBody, SecuritySolutionRequestHandlerContext> =>
  async (context, request, response) => {
    const siemResponse = buildSiemResponse(response);
    const { milestoneId } = request.body;
    try {
      logger.debug(
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
      logger.debug('Get Trial Companion NBA route called');
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
  if (!user) {
    return left(
      response.notFound({
        body: 'User not found',
      })
    );
  }

  if (!user.roles?.includes('admin')) {
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
