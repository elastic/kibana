/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { ToolType } from '@kbn/agent-builder-common';
import { ToolResultType } from '@kbn/agent-builder-common/tools/tool_result';
import type { BuiltinToolDefinition } from '@kbn/agent-builder-server';
import type { Logger } from '@kbn/core/server';
import type { SandboxPluginStart, SandboxSession } from '@kbn/sandbox-plugin/server';
import type { ResolveConnectorCredentials } from './connector_credentials';
import { redactSecrets } from './connector_credentials';
import { getConversationId, getSandboxCallContext } from './tool_utils';
import type { SandboxWorkspaceManager } from './sandbox_workspace_manager';
import {
  MAX_SANDBOX_SECRETS,
  MAX_SANDBOX_SECRET_KEY_LENGTH,
} from '../../../common/sandbox_secrets';
import type { SandboxSecretsClient } from '../../sandbox_secrets';

export const SANDBOX_BASH_TOOL_ID = 'nightshift_sandbox_bash';

const sandboxBashSchema = z.object({
  command: z
    .string()
    .describe('Bash command to execute in the sandbox (runs as: bash -c <command>)'),
  working_directory: z
    .string()
    .optional()
    .describe('Working directory inside the sandbox (default: /workspace)'),
  env: z
    .record(z.string(), z.string())
    .optional()
    .describe('Additional environment variables to set for this command'),
  timeout_seconds: z
    .number()
    .optional()
    .describe('Timeout in seconds; 0 or omitted uses the server default of 600s'),
  connector_id: z
    .string()
    .optional()
    .describe(
      'Connector whose credentials this command needs (see /workspace/connectors.md). Its config and secrets are exposed to this command only, as CONNECTOR_CONFIG_<KEY> / CONNECTOR_SECRET_<KEY> environment variables, and are gone when the command exits.'
    ),
  secret_keys: z
    .array(z.string().max(MAX_SANDBOX_SECRET_KEY_LENGTH))
    .max(MAX_SANDBOX_SECRETS)
    .optional()
    .describe(
      'Names of sandbox secrets (see /workspace/connectors.md) this command needs. Each one is exposed to this command only, as an environment variable of the same name, and is gone when the command exits.'
    ),
});

export const createSandboxBashTool = ({
  getSandboxStart,
  sandboxWorkspaceManager,
  resolveConnectorCredentials,
  sandboxSecretsClient,
  logger,
}: {
  getSandboxStart: () => SandboxPluginStart | undefined;
  sandboxWorkspaceManager: SandboxWorkspaceManager;
  resolveConnectorCredentials?: ResolveConnectorCredentials;
  sandboxSecretsClient?: Pick<SandboxSecretsClient, 'resolveForCommand'>;
  logger: Logger;
}): BuiltinToolDefinition<typeof sandboxBashSchema> => ({
  id: SANDBOX_BASH_TOOL_ID,
  type: ToolType.builtin,
  description:
    'Execute a bash command inside a sandboxed container. Use this to run shell commands, scripts, or any computation that requires a shell environment. Python 3 is available as `python` (via /home/appuser/.venv/bin/python). The default working directory is /workspace. To call an external service through a Kibana connector, read /workspace/connectors.md and pass the connector id as `connector_id`: the connector credentials are then available to that single command as CONNECTOR_* environment variables (e.g. `curl -H "Authorization: Bearer $CONNECTOR_SECRET_TOKEN" "$CONNECTOR_CONFIG_APIURL/..."`). To use a sandbox secret listed in /workspace/connectors.md, pass its name in `secret_keys`: it is then available to that single command as an environment variable of the same name (e.g. `secret_keys: ["GITHUB_TOKEN"]` with `curl -H "Authorization: Bearer $GITHUB_TOKEN" ...`).',
  tags: ['sandbox', 'bash'],
  schema: sandboxBashSchema,
  annotations: {
    title: 'Run Bash Command',
    readOnlyHint: false,
    destructiveHint: true,
    idempotentHint: false,
    openWorldHint: true,
  },
  excludeFromMcp: true,
  handler: async (params, context) => {
    const { command, working_directory, env, timeout_seconds, connector_id, secret_keys } = params;

    const rawConversationId = getConversationId(context);
    if (!rawConversationId) {
      return {
        results: [
          {
            type: ToolResultType.error,
            data: { message: 'Cannot run sandbox command: no conversation context available.' },
          },
        ],
      };
    }

    const sandboxStart = getSandboxStart();
    if (!sandboxStart) {
      return {
        results: [{ type: ToolResultType.error, data: { message: 'Sandbox is not available.' } }],
      };
    }

    let session: SandboxSession;
    try {
      session = sandboxStart.getSession(context.request, rawConversationId);
    } catch (err) {
      return {
        results: [
          {
            type: ToolResultType.error,
            data: { message: err instanceof Error ? err.message : 'Sandbox is not available.' },
          },
        ],
      };
    }

    const callContext = getSandboxCallContext(context);

    await sandboxWorkspaceManager.ensureWorkspaceReady({
      session,
      callContext,
    });

    // Connector credentials are resolved in Kibana and scoped to this one command's environment.
    // The sandbox never holds a credential-retrieval primitive of its own.
    let credentialEnv: Record<string, string> = {};
    let secretValues: readonly string[] = [];
    if (connector_id) {
      if (!resolveConnectorCredentials) {
        return {
          results: [
            {
              type: ToolResultType.error,
              data: { message: 'Connector credentials are not available in this deployment.' },
            },
          ],
        };
      }
      const resolved = await resolveConnectorCredentials(connector_id, callContext);
      if ('errorMessage' in resolved) {
        return {
          results: [{ type: ToolResultType.error, data: { message: resolved.errorMessage } }],
        };
      }
      credentialEnv = resolved.env;
      secretValues = resolved.secretValues;
    }

    let sandboxSecretsEnv: Record<string, string> = {};
    if (secret_keys && secret_keys.length > 0) {
      if (!sandboxSecretsClient) {
        return {
          results: [
            {
              type: ToolResultType.error,
              data: { message: 'Sandbox secrets are not available in this deployment.' },
            },
          ],
        };
      }
      const resolved = await sandboxSecretsClient.resolveForCommand(context.request, secret_keys);
      if ('errorMessage' in resolved) {
        return {
          results: [{ type: ToolResultType.error, data: { message: resolved.errorMessage } }],
        };
      }
      sandboxSecretsEnv = resolved.env;
      secretValues = [...secretValues, ...resolved.secretValues];
    }

    logger.debug(`Executing sandbox bash command for session ${rawConversationId}: ${command}`);

    try {
      // Prepend the venv bin dir so `python` resolves without requiring a full path.
      // Secret and credential vars are applied last so agent-supplied env cannot shadow them.
      const mergedEnv: Record<string, string> = {
        PATH: `/home/appuser/.venv/bin:/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin`,
        ...env,
        ...sandboxSecretsEnv,
        ...credentialEnv,
      };

      const result = await session.runCommand({
        command,
        directory: working_directory,
        env: mergedEnv,
        timeout_seconds,
      });

      const { exit_code, timed_out } = result;
      const stdout = redactSecrets(result.stdout, secretValues);
      const stderr = redactSecrets(result.stderr, secretValues);

      if (timed_out || exit_code !== 0) {
        const message = [
          timed_out ? 'Command timed out.' : `Command exited with code ${exit_code}.`,
          stdout ? `stdout:\n${stdout}` : '',
          stderr ? `stderr:\n${stderr}` : '',
        ]
          .filter(Boolean)
          .join('\n');

        return {
          results: [{ type: ToolResultType.error, data: { message } }],
        };
      }

      return {
        results: [
          {
            type: ToolResultType.other,
            data: { stdout, stderr, exit_code },
          },
        ],
      };
    } catch (error) {
      logger.error(`Sandbox bash tool failed: ${error}`);
      return {
        results: [
          {
            type: ToolResultType.error,
            data: {
              message: `Failed to execute sandbox command: ${
                error instanceof Error ? error.message : String(error)
              }`,
            },
          },
        ],
      };
    }
  },
});
