/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IKibanaResponse, Logger } from '@kbn/core/server';
import { i18n } from '@kbn/i18n';
import { transformError } from '@kbn/securitysolution-es-utils';
import { buildRouteValidationWithZod } from '@kbn/zod-helpers/v4';
import { DETECTION_ENGINE_EMULATION_RUN_COMMAND_URL } from '../../../../../common/constants';
import type { SecuritySolutionPluginRouter } from '../../../../types';
import { buildSiemResponse } from '../../../detection_engine/routes/utils';
import { RunEmulationCommandInputSchema } from '../../../../../common/detection_emulation/schemas/run_emulation_command_input';
import {
  EmulationRunner,
  UnsupportedAgentTypeError,
  UnsupportedCommandForAgentTypeError,
  MissingConnectorActionsError,
} from '../../execution/runner';
import type { ConfigType } from '../../../../config';
import { EmulationAllowlist, createAllowlistFromConfig } from '../../execution/allowlist';
import { EmulationRateLimiter, createDefaultRateLimiterConfig } from '../../execution/rate_limiter';
import {
  EmulationIdempotencyCache,
  buildIdempotencyKey,
  createDefaultIdempotencyCacheConfig,
} from '../../execution/idempotency_cache';
import {
  RESPONSE_ACTION_API_COMMAND_TO_CONSOLE_COMMAND_MAP,
  RESPONSE_CONSOLE_ACTION_COMMANDS_TO_REQUIRED_AUTHZ,
} from '../../../../../common/endpoint/service/response_actions/constants';
import { createSavedObjectRuleBindingLookup } from '../../rule_binding_lookup';
import { emulationRuleBindingTypeName } from '../../rule_binding';
import {
  checkRealExecutionFeatureFlags,
  checkAllowlist as checkAllowlistGate,
  acquireRateLimit as acquireRateLimitGate,
} from '../../../../agent_builder/skills/detection_emulation/gate_checks';
import { resolveAllowlistConfig, resolveRateLimiterConfig } from '../../runtime_config_resolver';

const I18N_PREFIX = 'xpack.securitySolution.detectionEmulation.route' as const;

const MESSAGES = {
  featureDisabled: i18n.translate(`${I18N_PREFIX}.featureDisabled`, {
    defaultMessage: 'Detection emulation real execution is disabled.',
  }),
  authRequired: i18n.translate(`${I18N_PREFIX}.authRequired`, {
    defaultMessage: 'Authentication is required to run an emulation command.',
  }),
  insufficientPrivileges: (privilege: string) =>
    i18n.translate(`${I18N_PREFIX}.insufficientPrivileges`, {
      defaultMessage: 'Insufficient privileges: command requires [{privilege}].',
      values: { privilege },
    }),
  endpointsNotInAllowlist: i18n.translate(`${I18N_PREFIX}.endpointsNotInAllowlist`, {
    defaultMessage: 'Endpoints not in allowlist.',
  }),
  rateLimitExceeded: i18n.translate(`${I18N_PREFIX}.rateLimitExceeded`, {
    defaultMessage: 'Rate limit exceeded.',
  }),
  agentTypeNotYetSupported: i18n.translate(`${I18N_PREFIX}.agentTypeNotYetSupported`, {
    defaultMessage:
      'This agent type is not yet wired through the route — only `endpoint` is supported today.',
  }),
  unsupportedCommand: i18n.translate(`${I18N_PREFIX}.unsupportedCommand`, {
    defaultMessage: 'The requested command is not supported for this agent type.',
  }),
  internalError: i18n.translate(`${I18N_PREFIX}.internalError`, {
    defaultMessage: 'Failed to dispatch the emulation command.',
  }),
} as const;

export const runEmulationCommandRoute = (
  router: SecuritySolutionPluginRouter,
  config: ConfigType,
  logger: Logger,
  {
    allowlist: allowlistOverride,
    rateLimiter: rateLimiterOverride,
    idempotencyCache: idempotencyCacheOverride,
  }: {
    allowlist?: EmulationAllowlist;
    rateLimiter?: EmulationRateLimiter;
    idempotencyCache?: EmulationIdempotencyCache;
  } = {}
) => {
  // The allowlist + rate limiter + idempotency cache are constructed once per route
  // registration and shared across requests. The `*Override` parameters exist so the
  // test suite can inject a restrictive allowlist or an exhausted rate limiter without
  // standing up the full config-loading pipeline. (N7) Real production wiring reads
  // optional `xpack.securitySolution.detectionEmulation.*` settings; absent settings
  // fall back to the safe defaults below.
  const emulationConfig = config.detectionEmulation;

  // PROD-1: route now defaults to deny when no operator config is supplied.
  // The wiring is delegated to `createAllowlistFromConfig` so the route, the
  // validate_rule route, and the five Agent Builder tools all interpret the
  // operator config the same way — drift between them would mean some
  // surfaces default-allow while others default-deny.
  if (!allowlistOverride && !emulationConfig?.allowlist) {
    logger.warn(
      '[detection-emulation] runCommand route registered with NO operator allowlist (`xpack.securitySolution.detectionEmulation.allowlist`); default-deny is in effect — every request will be blocked until the allowlist is configured.'
    );
  }
  const allowlist =
    allowlistOverride ??
    new EmulationAllowlist(createAllowlistFromConfig(emulationConfig?.allowlist), logger);

  const rateLimiter =
    rateLimiterOverride ??
    new EmulationRateLimiter(
      emulationConfig?.rateLimiter ?? createDefaultRateLimiterConfig(),
      logger
    );

  const idempotencyCache =
    idempotencyCacheOverride ??
    new EmulationIdempotencyCache(
      emulationConfig?.idempotencyCache ?? createDefaultIdempotencyCacheConfig(),
      logger
    );

  router.versioned
    .post({
      path: DETECTION_ENGINE_EMULATION_RUN_COMMAND_URL,
      access: 'internal',
      // Declarative authz — replaces the legacy `tags: ['access:securitySolution']`
      // form so RBAC tooling, OpenAPI, and ESLint plugins can all read the
      // privilege requirement from a single source.
      security: {
        authz: {
          requiredPrivileges: ['securitySolution'],
        },
      },
      options: {
        tags: ['oas-tag:emulation'],
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

          // Gate 1: feature flag + runtime kill switch
          const ffResult = checkRealExecutionFeatureFlags(config);
          if (!ffResult.ok) {
            logger.warn(
              `Emulation command [${command}] for emulation [${emulationId}] blocked: ${ffResult.message}`
            );
            return siemResponse.error({
              statusCode: 403,
              body: ffResult.extra?.likely_cause
                ? `${MESSAGES.featureDisabled} ${ffResult.extra.likely_cause}.`
                : MESSAGES.featureDisabled,
            });
          }

          const coreContext = await context.core;
          const securitySolution = await context.securitySolution;
          const spaceId = securitySolution.getSpaceId();

          // N5: refuse to dispatch a destructive action without an authenticated caller.
          // Previously the code fell back to username='unknown', leaving the audit trail
          // incomplete and accountability ambiguous.
          const currentUser = coreContext.security?.authc.getCurrentUser();
          if (!currentUser?.username) {
            logger.warn(
              `Emulation command [${command}] for emulation [${emulationId}] blocked: no authenticated user`
            );
            return siemResponse.error({ statusCode: 401, body: MESSAGES.authRequired });
          }

          // Gate 2: per-command RBAC. Console-command names map to required Endpoint
          // privileges; we look up the privilege the caller would need and reject if
          // they don't hold it. The privilege key is included in the response body
          // because operators need it for diagnosis (which privilege to grant).
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
                body: MESSAGES.insufficientPrivileges(requiredAuthzKey),
              });
            }
            logger.debug(
              `RBAC check passed for command [${command}]: user has privilege [${requiredAuthzKey}]`
            );
          }

          // Per-request resolution of operator-tunable guardrails. Reads
          // four `securitySolution:detectionEmulation:*` Advanced Settings
          // for the current space and falls back to `kibana.yml` defaults
          // (the singleton allowlist/rateLimiter constructed at route
          // registration is the fallback baseline). Single resolver call
          // shared by both the allowlist (Gate 3) and rate-limiter (Gate 4)
          // checks below — same uiSettings client read, no duplicate work.
          const [effectiveAllowlist, effectiveRateLimiter] = await Promise.all([
            resolveAllowlistConfig({
              uiSettingsClient: coreContext.uiSettings.client,
              config,
              logger,
            }),
            resolveRateLimiterConfig({
              uiSettingsClient: coreContext.uiSettings.client,
              config,
              logger,
              constructorConfig: rateLimiter.getConfig(),
            }),
          ]);

          // Gate 3: host allowlist
          const allowlistResult = checkAllowlistGate(allowlist, endpointIds, effectiveAllowlist);
          if (!allowlistResult.ok) {
            logger.warn(
              `Emulation command [${command}] for emulation [${emulationId}] blocked by allowlist: ${allowlistResult.message}`
            );
            return siemResponse.error({
              statusCode: 403,
              body: {
                message: MESSAGES.endpointsNotInAllowlist,
                blocked_endpoints: allowlistResult.extra?.blocked_endpoints,
              },
            });
          }

          // Gate 4 (a): idempotency cache (N6). If the *exact* same dispatch tuple
          // (space, emulation, command, agentType, sorted endpointIds) was processed
          // within the cache TTL, replay the cached result instead of dispatching a
          // second response action. This swallows double-clicks, network retries, and
          // LLM replays without consuming a fresh rate-limit slot.
          const idempotencyKey = buildIdempotencyKey({
            spaceId,
            emulationId,
            command,
            agentType: request.body.agentType,
            endpointIds,
          });
          const cached = idempotencyCache.get(spaceId, idempotencyKey);
          if (cached) {
            logger.debug(
              `Idempotency cache replay for emulation [${emulationId}] command [${command}] (action_id=${cached.actionId})`
            );
            if (cached.status === 'dispatched') {
              return response.ok({
                body: {
                  action_id: cached.actionId,
                  agent_type: cached.agentType,
                  command: cached.command,
                  status: cached.status,
                },
              });
            }
            // Cached error replay — same status code we'd return on a fresh dispatch
            // failure. We don't echo the original error string to the client (I3).
            return siemResponse.error({
              statusCode: 502,
              body: { message: MESSAGES.internalError, action_id: cached.actionId },
            });
          }

          // Gate 4 (b): atomic rate-limit acquire
          const rateLimitResult = acquireRateLimitGate(
            rateLimiter,
            spaceId,
            emulationId,
            command,
            endpointIds,
            effectiveRateLimiter
          );
          if (!rateLimitResult.ok) {
            logger.warn(
              `Emulation command [${command}] for emulation [${emulationId}] blocked by rate limiter: ${rateLimitResult.message}`
            );
            return siemResponse.error({
              statusCode: 429,
              body: {
                message: MESSAGES.rateLimitExceeded,
                current_count: rateLimitResult.extra?.current_count,
                max_commands: rateLimitResult.extra?.max_commands,
                reset_ms: rateLimitResult.extra?.reset_ms,
                ...(rateLimitResult.extra?.blocked_endpoints
                  ? { blocked_endpoints: rateLimitResult.extra.blocked_endpoints }
                  : {}),
              },
            });
          }

          // All gates passed — execute the command.
          //
          // Rule-binding lookup (I7): the SO type is registered with
          // `hidden: true`, so we need the *internal* SO client (the request-
          // scoped one cannot see hidden types). The runner owns calling it
          // exactly once per dispatch and threads `ruleId` / `ruleName` into
          // the action so downstream queries can join emulation runs back to
          // the rule that produced them.
          const internalSoClient = coreContext.savedObjects.getClient({
            includedHiddenTypes: [emulationRuleBindingTypeName],
          });
          const endpointService = securitySolution.getEndpointService();
          // The cases client is acquired via endpointService rather than a direct
          // `context.cases` handler because security_solution's
          // `SecuritySolutionRequestHandlerContext` does not register the cases
          // plugin context. We swallow `getCasesClient` failures because cases
          // is optional for emulation dispatch — the action still goes out.
          let casesClient;
          try {
            casesClient = await endpointService.getCasesClient(request);
          } catch (err) {
            logger.debug(
              `Cases client unavailable for emulation dispatch: ${(err as Error).message ?? err}`
            );
            casesClient = undefined;
          }

          // PROD-2: REST callers are direct human invocations. Tag the
          // audit comment with `kind: 'user'` so the response action
          // trail distinguishes them from agent-driven dispatches that
          // come through the Agent Builder per-family tools.
          const runner = new EmulationRunner({
            endpointService,
            esClient: coreContext.elasticsearch.client.asCurrentUser,
            spaceId,
            casesClient,
            username: currentUser.username,
            logger,
            ruleBindingLookup: createSavedObjectRuleBindingLookup(internalSoClient, logger),
            actorContext: { kind: 'user' },
          });

          let result;
          try {
            result = await runner.run(request.body);
          } catch (runnerErr) {
            // Roll back the rate-limit acquire on a thrown gate-style error so a
            // misconfigured request doesn't permanently consume a slot.
            rateLimiter.release(rateLimitResult.value.token);
            return mapRunnerThrow(runnerErr, siemResponse, logger);
          }

          if (result.status === 'error') {
            // Internal dispatch failure (Fleet down, connector unavailable, etc.).
            // Roll the rate-limit acquire back so retries are not penalised.
            rateLimiter.release(rateLimitResult.value.token);
            // Don't leak the underlying error message to the client — it can include
            // ES/Fleet/connector internals. Log the full message server-side, return a
            // stable user-facing string in the response body.
            logger.error(
              `Emulation command [${command}] for emulation [${emulationId}] dispatch failed: ${
                result.error ?? 'unknown'
              }`
            );
            // N6: cache the error too, so the immediate retry from a flaky network
            // sees the same answer rather than racing the rate limiter. We TTL the
            // failure shortly so genuine retries after the connector recovers do
            // dispatch again.
            idempotencyCache.set(spaceId, idempotencyKey, {
              actionId: result.actionId,
              agentType: request.body.agentType,
              command,
              status: 'error',
              error: result.error,
            });
            return siemResponse.error({
              statusCode: 502,
              body: {
                message: MESSAGES.internalError,
                action_id: result.actionId,
              },
            });
          }

          // N6: cache the successful dispatch so an immediate replay returns the same
          // action_id rather than firing a second Response Action.
          idempotencyCache.set(spaceId, idempotencyKey, {
            actionId: result.actionId,
            agentType: result.agentType,
            command: result.command,
            status: result.status,
          });

          return response.ok({
            body: {
              action_id: result.actionId,
              agent_type: result.agentType,
              command: result.command,
              status: result.status,
            },
          });
        } catch (err) {
          // Untyped catch-all. We log the real error server-side and return a generic
          // error to the client (I3) — `transformError`'s message frequently echoes
          // exception text from ES, Fleet, or downstream connectors.
          const error = transformError(err);
          logger.error(`Error running emulation command: ${error.message}`);
          return siemResponse.error({
            statusCode: error.statusCode,
            body: MESSAGES.internalError,
          });
        }
      }
    );
};

/**
 * Map a runner-raised typed error onto an HTTP response.
 *
 * Keeps the runner authoritative on classification (the runner knows
 * which conditions are "user input was wrong" versus "downstream blew
 * up") and the route authoritative on protocol mapping.
 */
function mapRunnerThrow(
  runnerErr: unknown,
  siemResponse: ReturnType<typeof buildSiemResponse>,
  logger: Logger
): IKibanaResponse {
  if (runnerErr instanceof MissingConnectorActionsError) {
    logger.warn(`Emulation request rejected: ${runnerErr.message}`);
    return siemResponse.error({ statusCode: 400, body: MESSAGES.agentTypeNotYetSupported });
  }
  if (runnerErr instanceof UnsupportedAgentTypeError) {
    logger.warn(`Emulation request rejected: ${runnerErr.message}`);
    return siemResponse.error({ statusCode: 400, body: MESSAGES.agentTypeNotYetSupported });
  }
  if (runnerErr instanceof UnsupportedCommandForAgentTypeError) {
    logger.warn(`Emulation request rejected: ${runnerErr.message}`);
    return siemResponse.error({ statusCode: 400, body: MESSAGES.unsupportedCommand });
  }
  // Unknown error class — log full text, return generic message.
  const message = runnerErr instanceof Error ? runnerErr.message : String(runnerErr);
  logger.error(`Unexpected runner error: ${message}`);
  return siemResponse.error({ statusCode: 500, body: MESSAGES.internalError });
}
