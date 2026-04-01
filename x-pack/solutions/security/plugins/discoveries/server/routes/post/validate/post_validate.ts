/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IRouter, Logger } from '@kbn/core/server';
import type { IRuleDataClient } from '@kbn/rule-registry-plugin/server';
import { transformError } from '@kbn/securitysolution-es-utils';
import { PostValidateRequestBody } from '@kbn/discoveries-schemas';
import { ATTACK_DISCOVERY_API_ACTION_ALL } from '@kbn/security-solution-features/actions';
import { getSpaceId } from '@kbn/discoveries/impl/lib/helpers/get_space_id';
import { assertWorkflowsEnabled } from '../../../lib/assert_workflows_enabled';
import type { WorkflowInitializationService } from '../../../lib/workflow_initialization';
import { validateAttackDiscoveries } from './helpers/validate_attack_discoveries';

const ROUTE_PATH = '/internal/attack_discovery/_validate';

export const registerValidateRoute = (
  router: IRouter,
  logger: Logger,
  {
    adhocAttackDiscoveryDataClient,
    getStartServices,
    workflowInitService,
  }: {
    adhocAttackDiscoveryDataClient: IRuleDataClient;
    getStartServices: () => Promise<{
      pluginsStart: import('../../../types').DiscoveriesPluginStartDeps;
    }>;
    workflowInitService: WorkflowInitializationService;
  }
) => {
  router.versioned
    .post({
      access: 'internal',
      path: ROUTE_PATH,
      security: {
        authz: {
          requiredPrivileges: [ATTACK_DISCOVERY_API_ACTION_ALL],
        },
      },
    })
    .addVersion(
      {
        version: '1',
        validate: {
          request: {
            body: PostValidateRequestBody,
          },
        },
      },
      async (context, request, response) => {
        const disabledResponse = await assertWorkflowsEnabled({ context, response });
        if (disabledResponse) {
          return disabledResponse;
        }

        const bodyResult = PostValidateRequestBody.safeParse(request.body);
        if (!bodyResult.success) return response.badRequest({ body: bodyResult.error });

        try {
          const { pluginsStart } = await getStartServices();

          logger.info(
            `Validating ${request.body.attack_discoveries.length} attack discoveries with generation UUID: ${request.body.generation_uuid}`
          );

          const currentUser = pluginsStart.security.authc.getCurrentUser(request);
          if (!currentUser) throw new Error('Authenticated user is required');

          const spaceId = getSpaceId({
            request,
            spaces: pluginsStart.spaces?.spacesService,
          });

          workflowInitService.ensureWorkflowsForSpace({ logger, request, spaceId }).catch((err) => {
            logger.debug(
              () =>
                `Background workflow initialization failed for space '${spaceId}': ${err.message}`
            );
          });

          return response.ok({
            body: await validateAttackDiscoveries({
              adhocAttackDiscoveryDataClient,
              authenticatedUser: currentUser,
              logger,
              spaceId,
              validateRequestBody: bodyResult.data,
            }),
          });
        } catch (err) {
          const errorMessage = err instanceof Error ? err.message : String(err);
          logger.error(`Error validating discoveries: ${errorMessage}`);
          const error = transformError(err);

          return response.customError({
            statusCode: error.statusCode,
            body: {
              message: error.message,
            },
          });
        }
      }
    );
};
