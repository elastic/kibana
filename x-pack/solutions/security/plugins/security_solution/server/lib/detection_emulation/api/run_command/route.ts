/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IKibanaResponse, Logger } from '@kbn/core/server';
import { transformError } from '@kbn/securitysolution-es-utils';
import { buildRouteValidationWithZod } from '@kbn/zod-helpers/v4';
import { DETECTION_ENGINE_EMULATION_RUN_COMMAND_URL } from '../../../../../common/constants';
import type { SecuritySolutionPluginRouter } from '../../../../types';
import { buildSiemResponse } from '../../../detection_engine/routes/utils';
import { RunEmulationCommandInputSchema } from '../../../../../common/detection_emulation/schemas/run_emulation_command_input';
import { EmulationRunner } from '../../execution/runner';
import type { ConfigType } from '../../../../config';
import { getDetectionEmulationFeatureFlags, isRealExecutionEnabled } from '../../feature_flag';
import { EmulationAllowlist, createDefaultAllowlistConfig } from '../../execution/allowlist';
import { EmulationRateLimiter, createDefaultRateLimiterConfig } from '../../execution/rate_limiter';
import {
  RESPONSE_ACTION_API_COMMAND_TO_CONSOLE_COMMAND_MAP,
  RESPONSE_CONSOLE_ACTION_COMMANDS_TO_REQUIRED_AUTHZ,
} from '../../../../../common/endpoint/service/response_actions/constants';

export const runEmulationCommandRoute = (
  router: SecuritySolutionPluginRouter,
  config: ConfigType,
  logger: Logger,
  {
    allowlist: allowlistOverride,
    rateLimiter: rateLimiterOverride,
  }: { allowlist?: EmulationAllowlist; rateLimiter?: EmulationRateLimiter } = {}
) => {
  // Initialize allowlist and rate limiter with default configurations
  // TODO: Load configuration from Kibana config or saved objects
  const allowlist =
    allowlistOverride ?? new EmulationAllowlist(createDefaultAllowlistConfig(), logger);
  const rateLimiter =
    rateLimiterOverride ?? new EmulationRateLimiter(createDefaultRateLimiterConfig(), logger);

  router.versioned
    .post({
      path: DETECTION_ENGINE_EMULATION_RUN_COMMAND_URL,
      access: 'internal',
      options: {
        tags: ['access:securitySolution', 'oas-tag:emulation'],
        availability: {
          stability: 'experimental',
        },
      },
    })
    .addVersion(
      {
        version: '1',
        validate: {
          request: {
            body: buildRouteValidationWithZod(RunEmulationCommandInputSchema),
          },
        },
      },
      async (context, request, response): Promise<IKibanaResponse> => {
        const siemResponse = buildSiemResponse(response);

        try {
          const { emulationId, command, endpointIds } = request.body;

          const featureFlags = getDetectionEmulationFeatureFlags(config);

          // Gate 1: Feature flag check (wholesale enable/disable)
          if (!isRealExecutionEnabled(featureFlags)) {
            logger.warn(
              `Emulation command [${command}] for emulation [${emulationId}] blocked: real execution is disabled`
            );
            return siemResponse.error({
              statusCode: 403,
              body: 'Detection emulation real execution is disabled',
            });
          }

          const coreContext = await context.core;
          const securitySolution = await context.securitySolution;
          const spaceId = securitySolution.getSpaceId();

          // Gate 2: Per-command RBAC check
          const consoleCommand = RESPONSE_ACTION_API_COMMAND_TO_CONSOLE_COMMAND_MAP[command];
          const requiredAuthzKey =
            RESPONSE_CONSOLE_ACTION_COMMANDS_TO_REQUIRED_AUTHZ[consoleCommand];

          if (requiredAuthzKey) {
            const endpointAuthz = await securitySolution.getEndpointAuthz();
            const hasPrivilege = endpointAuthz[requiredAuthzKey];

            if (!hasPrivilege) {
              logger.warn(
                `Emulation command [${command}] for emulation [${emulationId}] blocked: user lacks required RBAC privilege [${requiredAuthzKey}]`
              );
              return siemResponse.error({
                statusCode: 403,
                body: `Insufficient privileges: command [${command}] requires [${requiredAuthzKey}]`,
              });
            }

            logger.debug(
              `RBAC check passed for command [${command}]: user has privilege [${requiredAuthzKey}]`
            );
          }

          // Gate 3: Host allowlist validation
          const allowlistResult = allowlist.validate(endpointIds);
          if (!allowlistResult.allowed) {
            logger.warn(
              `Emulation command [${command}] for emulation [${emulationId}] blocked by allowlist: ${allowlistResult.error}`
            );
            return siemResponse.error({
              statusCode: 403,
              body: {
                message: allowlistResult.error ?? 'Endpoints not in allowlist',
                blocked_endpoints: allowlistResult.blockedEndpoints,
              },
            });
          }

          // Gate 4: Rate limit check
          const rateLimitResult = rateLimiter.check(spaceId);
          if (!rateLimitResult.allowed) {
            logger.warn(
              `Emulation command [${command}] for emulation [${emulationId}] blocked by rate limiter: ${rateLimitResult.error}`
            );
            return siemResponse.error({
              statusCode: 429,
              body: {
                message: rateLimitResult.error ?? 'Rate limit exceeded',
                current_count: rateLimitResult.currentCount,
                max_commands: rateLimitResult.maxCommands,
                reset_ms: rateLimitResult.resetMs,
              },
            });
          }

          // All gates passed - execute the command
          const runner = new EmulationRunner({
            endpointService: securitySolution.getEndpointService(),
            esClient: coreContext.elasticsearch.client.asCurrentUser,
            spaceId,
            casesClient: (await context.cases)?.getCasesClient(),
            username: coreContext.security?.authc.getCurrentUser()?.username ?? 'unknown',
            logger,
          });

          const result = await runner.run(request.body);

          if (result.status === 'error') {
            return siemResponse.error({
              statusCode: 500,
              body: {
                message: result.error ?? 'Unknown error executing emulation command',
                action_id: result.actionId,
              },
            });
          }

          // Record successful execution in rate limiter
          rateLimiter.record(spaceId, emulationId, command);

          return response.ok({
            body: {
              action_id: result.actionId,
              agent_type: result.agentType,
              command: result.command,
              status: result.status,
            },
          });
        } catch (err) {
          const error = transformError(err);
          logger.error(`Error running emulation command: ${error.message}`);
          return siemResponse.error({
            body: error.message,
            statusCode: error.statusCode,
          });
        }
      }
    );
};
