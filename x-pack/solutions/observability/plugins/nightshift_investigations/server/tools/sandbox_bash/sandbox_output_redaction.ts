/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ZodObject } from '@kbn/zod/v4';
import type { Logger } from '@kbn/core/server';
import type { PluginStartContract as ActionsPluginStart } from '@kbn/actions-plugin/server';
import { ToolResultType } from '@kbn/agent-builder-common/tools/tool_result';
import type { BuiltinToolDefinition } from '@kbn/agent-builder-server';
import { isToolHandlerStandardReturn } from '@kbn/agent-builder-server';
import type { SandboxSecretsClient } from '../../sandbox_secrets';
import {
  buildConnectorEnv,
  deriveConnectorCredentialSecretValues,
  resolveSandboxCredentials,
} from './connector_credentials';
import { listSandboxCapableAgentConnectors } from './agent_connectors';
import { createOutputRedactor, redactDeep, type OutputRedactor } from './output_redactor';
import type { SandboxCallContext, SandboxToolHandlerContext } from './tool_utils';
import { getSandboxCallContext } from './tool_utils';

export type GetSandboxOutputRedactor = (callContext: SandboxCallContext) => Promise<OutputRedactor>;

const collectSecretLeaves = (value: unknown): string[] => {
  if (typeof value === 'string') return [value];
  if (typeof value === 'number') return [String(value)];
  if (Array.isArray(value)) return value.flatMap(collectSecretLeaves);
  if (value !== null && typeof value === 'object') {
    return Object.values(value).flatMap(collectSecretLeaves);
  }
  return [];
};

export class SandboxConnectorRedactionError extends Error {
  constructor(public readonly connectorId: string | undefined, cause: Error) {
    super(
      connectorId === undefined
        ? `Connectors assigned to this agent cannot be listed for output redaction: ${cause.message}`
        : `Connector '${connectorId}' cannot be resolved for output redaction: ${cause.message}`
    );
    this.name = 'SandboxConnectorRedactionError';
  }
}

/**
 * Secret values the sandbox could have received from an agent's connectors: the auth header
 * values `buildConnectorEnv` injects, resolved for every sandbox capable connector on the
 * allow-list, preconfigured or saved. The redactor knows the exact header values the bash tool
 * would inject, including values derived from secrets (e.g. a basic auth header or an OAuth2
 * access token). Allow-listed connectors that are not sandbox capable, deleted or not readable
 * never had credentials injected, so they are skipped. Any resolve failure of a remaining
 * connector fails the tool call, because a value injected by an earlier command may still be in
 * the sandbox.
 */
const getAllowedConnectorSecretValues = async ({
  actions,
  callContext,
}: {
  actions: ActionsPluginStart;
  callContext: SandboxCallContext;
}): Promise<string[]> => {
  if (callContext.allowedConnectorIds.length === 0) return [];

  const actionsClient = await actions.getActionsClientWithRequest(callContext.request);
  const connectors = await listSandboxCapableAgentConnectors(
    actionsClient,
    callContext.allowedConnectorIds
  ).catch((err) => {
    throw new SandboxConnectorRedactionError(undefined, err);
  });
  const connectorIds = [...new Set(connectors.map(({ id }) => id))];

  const secretValues = await Promise.all(
    connectorIds.map(async (connectorId) => {
      const credentials = await resolveSandboxCredentials({
        actions,
        callContext,
        connectorId,
      }).catch((err) => {
        throw new SandboxConnectorRedactionError(connectorId, err);
      });
      return buildConnectorEnv(credentials).secretValues;
    })
  );
  return secretValues.flat();
};

/**
 * Builds the redactor for sandbox tool output: every sandbox secret stored in the request's space,
 * every in-memory connector secret, and the resolved credentials of every connector assigned to
 * the agent. Every allow-listed connector (preconfigured or saved) is resolved, so the exact header
 * values the bash tool would inject are known to the redactor. Whether or not a call requested
 * them, any of these may have been written to a file or kept alive in a process by an earlier
 * command.
 */
export const createSandboxOutputRedactorProvider =
  ({
    getDeps,
  }: {
    getDeps: () => {
      actions?: ActionsPluginStart;
      sandboxSecretsClient?: Pick<SandboxSecretsClient, 'getRedactionValues'>;
    };
  }): GetSandboxOutputRedactor =>
  async (callContext) => {
    const { actions, sandboxSecretsClient } = getDeps();
    const { request } = callContext;
    const sandboxSecretValues = (await sandboxSecretsClient?.getRedactionValues(request)) ?? [];
    // Every raw secret leaf, plus any values a credential resolver derives from them (e.g. the
    // bare API key `deriveConnectorCredentialSecretValues` extracts out of an `Authorization`
    // header) — a value that never appears verbatim in `secrets` itself would otherwise round-trip
    // unredacted through a later tool call (e.g. reading back a file a bash command wrote it to).
    const connectorSecretValues = (actions?.inMemoryConnectors ?? []).flatMap(({ secrets }) => [
      ...collectSecretLeaves(secrets),
      ...deriveConnectorCredentialSecretValues(secrets),
    ]);
    const allowedConnectorSecretValues = actions
      ? await getAllowedConnectorSecretValues({ actions, callContext })
      : [];
    return createOutputRedactor([
      ...sandboxSecretValues,
      ...connectorSecretValues,
      ...allowedConnectorSecretValues,
    ]);
  };

/**
 * Wraps a sandbox tool so every string in its results is redacted. It creates the sandbox call
 * context and hands it to the tool through `sandboxCallContext`. The redactor is loaded before
 * the tool runs: when stored secrets cannot be loaded the tool is not run at all, since its output
 * could not be redacted.
 */
export const withSandboxOutputRedaction = <TSchema extends ZodObject>(
  tool: BuiltinToolDefinition<TSchema>,
  {
    getOutputRedactor,
    logger,
  }: {
    getOutputRedactor: GetSandboxOutputRedactor;
    logger: Logger;
  }
): BuiltinToolDefinition<TSchema> => ({
  ...tool,
  handler: async (params, context) => {
    const callContext = getSandboxCallContext(context);
    let redactor: OutputRedactor;
    try {
      redactor = await getOutputRedactor(callContext);
    } catch (err) {
      if (err instanceof SandboxConnectorRedactionError && err.connectorId === undefined) {
        logger.error(`Listing connectors for output redaction failed: ${err.message}`);
        return {
          results: [
            {
              type: ToolResultType.error,
              data: {
                message:
                  'Sandbox tools are unavailable: the connectors assigned to this agent could not be listed, so their credentials cannot be redacted from tool output. Try again or check the Kibana logs.',
              },
            },
          ],
        };
      }
      if (err instanceof SandboxConnectorRedactionError) {
        logger.error(`Resolving connector credentials for output redaction failed: ${err.message}`);
        return {
          results: [
            {
              type: ToolResultType.error,
              data: {
                message: `Sandbox tools are unavailable: connector '${err.connectorId}' assigned to this agent could not be resolved, so its credentials cannot be redacted from tool output. Remove it from the agent or restore access to it.`,
              },
            },
          ],
        };
      }
      logger.error(`Loading sandbox secrets for output redaction failed: ${err.message}`);
      return {
        results: [
          {
            type: ToolResultType.error,
            data: {
              message:
                'Sandbox tools are unavailable: stored sandbox secrets could not be loaded to redact tool output. Ask an administrator to re-save the sandbox secrets.',
            },
          },
        ],
      };
    }

    const toolContext: SandboxToolHandlerContext = { ...context, sandboxCallContext: callContext };
    const toolReturn = await tool.handler(params, toolContext);
    if (!isToolHandlerStandardReturn(toolReturn)) {
      return toolReturn;
    }
    return { ...toolReturn, results: redactDeep(toolReturn.results, redactor) };
  },
});
