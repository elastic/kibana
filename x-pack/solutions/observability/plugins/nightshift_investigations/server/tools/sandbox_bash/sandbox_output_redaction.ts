/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ZodObject } from '@kbn/zod/v4';
import type { KibanaRequest, Logger } from '@kbn/core/server';
import type { PluginStartContract as ActionsPluginStart } from '@kbn/actions-plugin/server';
import { ToolResultType } from '@kbn/agent-builder-common/tools/tool_result';
import type { BuiltinToolDefinition } from '@kbn/agent-builder-server';
import { isToolHandlerStandardReturn } from '@kbn/agent-builder-server';
import type { SandboxSecretsClient } from '../../sandbox_secrets';
import { createOutputRedactor, redactDeep, type OutputRedactor } from './output_redactor';

export type GetSandboxOutputRedactor = (request: KibanaRequest) => Promise<OutputRedactor>;

const collectSecretLeaves = (value: unknown): string[] => {
  if (typeof value === 'string') return [value];
  if (typeof value === 'number') return [String(value)];
  if (Array.isArray(value)) return value.flatMap(collectSecretLeaves);
  if (value !== null && typeof value === 'object') {
    return Object.values(value).flatMap(collectSecretLeaves);
  }
  return [];
};

/**
 * Builds the redactor for sandbox tool output: every sandbox secret stored in the request's space
 * and every in-memory connector secret. Whether or not a call requested them, any of these may
 * have been written to a file or kept alive in a process by an earlier command.
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
  async (request) => {
    const { actions, sandboxSecretsClient } = getDeps();
    const sandboxSecretValues = (await sandboxSecretsClient?.getRedactionValues(request)) ?? [];
    const connectorSecretValues = (actions?.inMemoryConnectors ?? []).flatMap(({ secrets }) =>
      collectSecretLeaves(secrets)
    );
    return createOutputRedactor([...sandboxSecretValues, ...connectorSecretValues]);
  };

/**
 * Wraps a sandbox tool so every string in its results is redacted. The redactor is loaded before
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
    let redactor: OutputRedactor;
    try {
      redactor = await getOutputRedactor(context.request);
    } catch (err) {
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

    const toolReturn = await tool.handler(params, context);
    if (!isToolHandlerStandardReturn(toolReturn)) {
      return toolReturn;
    }
    return { ...toolReturn, results: redactDeep(toolReturn.results, redactor) };
  },
});
