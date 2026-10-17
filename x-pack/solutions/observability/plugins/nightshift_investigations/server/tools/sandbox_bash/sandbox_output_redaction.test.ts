/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { httpServerMock, loggingSystemMock } from '@kbn/core/server/mocks';
import type { PluginStartContract as ActionsPluginStart } from '@kbn/actions-plugin/server';
import { ToolResultType } from '@kbn/agent-builder-common/tools/tool_result';
import type { BuiltinToolDefinition } from '@kbn/agent-builder-server';
import { REDACTED_PLACEHOLDER } from './output_redactor';
import {
  createSandboxOutputRedactorProvider,
  withSandboxOutputRedaction,
} from './sandbox_output_redaction';

const STORED_SECRET = 'stored-sandbox-secret';
const CONNECTOR_SECRET = 'connector-api-key-123';

const schema = z.object({});

const setup = ({
  getRedactionValues = jest.fn().mockResolvedValue([STORED_SECRET]),
  handlerReturn = {
    results: [
      {
        type: ToolResultType.other,
        data: { stdout: `a ${STORED_SECRET}`, nested: { stderr: `b ${CONNECTOR_SECRET}` } },
      },
    ],
  },
}: {
  getRedactionValues?: jest.Mock;
  handlerReturn?: unknown;
} = {}) => {
  const handler = jest.fn().mockResolvedValue(handlerReturn);
  const tool = { id: 'sandbox_tool', schema, handler } as unknown as BuiltinToolDefinition<
    typeof schema
  >;
  const actions = {
    inMemoryConnectors: [{ id: 'c1', secrets: { apiKey: CONNECTOR_SECRET } }],
  } as unknown as ActionsPluginStart;
  const logger = loggingSystemMock.createLogger();
  const wrapped = withSandboxOutputRedaction(tool, {
    getOutputRedactor: createSandboxOutputRedactorProvider({
      getDeps: () => ({ actions, sandboxSecretsClient: { getRedactionValues } }),
    }),
    logger,
  });
  const request = httpServerMock.createKibanaRequest();
  const run = () =>
    (wrapped.handler as unknown as (p: unknown, c: unknown) => Promise<unknown>)({}, { request });

  return { run, handler, getRedactionValues, logger, request };
};

describe('withSandboxOutputRedaction', () => {
  it('redacts stored sandbox secrets and connector secrets anywhere in the results', async () => {
    const { run, getRedactionValues, request } = setup();

    await expect(run()).resolves.toEqual({
      results: [
        {
          type: ToolResultType.other,
          data: {
            stdout: `a ${REDACTED_PLACEHOLDER}`,
            nested: { stderr: `b ${REDACTED_PLACEHOLDER}` },
          },
        },
      ],
    });
    expect(getRedactionValues).toHaveBeenCalledWith(request);
  });

  it('redacts the bare API key derived from a connector Authorization header', async () => {
    // A bare API key never appears as-is in a connector's raw `secrets`, only inside the full
    // `Authorization: ApiKey <key>` header — but a bash command can inject just the derived key
    // (CONNECTOR_SECRET_PASSWORD) and write it to a file, which a later tool call (e.g. view_file)
    // then reads back. That value must still be redacted from this tool's own results.
    const apiKey = 'derived-elasticsearch-api-key-value';
    const actions = {
      inMemoryConnectors: [
        { id: 'c1', secrets: { secretHeaders: { Authorization: `ApiKey ${apiKey}` } } },
      ],
    } as unknown as ActionsPluginStart;
    const handler = jest.fn().mockResolvedValue({
      results: [{ type: ToolResultType.other, data: { stdout: apiKey } }],
    });
    const tool = { id: 'sandbox_tool', schema, handler } as unknown as BuiltinToolDefinition<
      typeof schema
    >;
    const wrapped = withSandboxOutputRedaction(tool, {
      getOutputRedactor: createSandboxOutputRedactorProvider({
        getDeps: () => ({
          actions,
          sandboxSecretsClient: { getRedactionValues: jest.fn().mockResolvedValue([]) },
        }),
      }),
      logger: loggingSystemMock.createLogger(),
    });
    const request = httpServerMock.createKibanaRequest();

    await expect(
      (wrapped.handler as unknown as (p: unknown, c: unknown) => Promise<unknown>)({}, { request })
    ).resolves.toEqual({
      results: [{ type: ToolResultType.other, data: { stdout: REDACTED_PLACEHOLDER } }],
    });
  });

  describe('credentials the connector resolver hands out', () => {
    // E.g. a token the connector framework issues: it never appears in any connector's raw
    // `secrets`, so only the resolver knows it.
    const ISSUED_TOKEN = 'framework-issued-access-token';

    const runWithResolver = async ({
      resolveConnectorCredentials,
      connectorIds,
      stdout,
    }: {
      resolveConnectorCredentials: jest.Mock;
      connectorIds: string[];
      stdout: string;
    }) => {
      const handler = jest.fn().mockResolvedValue({
        results: [{ type: ToolResultType.other, data: { stdout } }],
      });
      const tool = { id: 'sandbox_tool', schema, handler } as unknown as BuiltinToolDefinition<
        typeof schema
      >;
      const wrapped = withSandboxOutputRedaction(tool, {
        getOutputRedactor: createSandboxOutputRedactorProvider({
          getDeps: () => ({
            actions: { inMemoryConnectors: [] } as unknown as ActionsPluginStart,
            sandboxSecretsClient: { getRedactionValues: jest.fn().mockResolvedValue([]) },
          }),
          resolveConnectorCredentials,
        }),
        logger: loggingSystemMock.createLogger(),
      });
      const request = httpServerMock.createKibanaRequest();
      const result = await (
        wrapped.handler as unknown as (p: unknown, c: unknown) => Promise<unknown>
      )({}, { request, agentConfiguration: { connector_ids: connectorIds } });
      return { result, handler, request };
    };

    it("redacts every value the resolver returns for the agent's connectors", async () => {
      const resolveConnectorCredentials = jest.fn().mockResolvedValue({
        env: { CONNECTOR_SECRET_TOKEN: ISSUED_TOKEN },
        secretValues: [ISSUED_TOKEN],
      });

      const { result, request } = await runWithResolver({
        resolveConnectorCredentials,
        connectorIds: ['github', 'jira'],
        stdout: `token=${ISSUED_TOKEN}`,
      });

      expect(result).toEqual({
        results: [
          { type: ToolResultType.other, data: { stdout: `token=${REDACTED_PLACEHOLDER}` } },
        ],
      });
      const callContext = { request, allowedConnectorIds: ['github', 'jira'] };
      expect(resolveConnectorCredentials).toHaveBeenCalledTimes(2);
      expect(resolveConnectorCredentials).toHaveBeenCalledWith('github', callContext);
      expect(resolveConnectorCredentials).toHaveBeenCalledWith('jira', callContext);
    });

    it('skips connectors the resolver denies', async () => {
      const resolveConnectorCredentials = jest.fn().mockResolvedValue({
        errorMessage: 'Not authorized',
      });

      const { result, handler } = await runWithResolver({
        resolveConnectorCredentials,
        connectorIds: ['github'],
        stdout: 'plain output',
      });

      expect(handler).toHaveBeenCalled();
      expect(result).toEqual({
        results: [{ type: ToolResultType.other, data: { stdout: 'plain output' } }],
      });
    });

    it('does not run the tool when resolving connector credentials fails', async () => {
      const resolveConnectorCredentials = jest.fn().mockRejectedValue(new Error('boom'));

      const { result, handler } = await runWithResolver({
        resolveConnectorCredentials,
        connectorIds: ['github'],
        stdout: ISSUED_TOKEN,
      });

      expect(handler).not.toHaveBeenCalled();
      expect(result).toEqual({
        results: [
          {
            type: ToolResultType.error,
            data: { message: expect.stringContaining('Sandbox tools are unavailable') },
          },
        ],
      });
    });
  });

  it('does not run the tool when stored secrets cannot be loaded', async () => {
    const { run, handler, logger } = setup({
      getRedactionValues: jest.fn().mockRejectedValue(new Error('Unable to decrypt')),
    });

    await expect(run()).resolves.toEqual({
      results: [
        {
          type: ToolResultType.error,
          data: { message: expect.stringContaining('Sandbox tools are unavailable') },
        },
      ],
    });
    expect(handler).not.toHaveBeenCalled();
    expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('Unable to decrypt'));
  });

  it('passes non-standard returns through unchanged', async () => {
    const handlerReturn = { prompt: { type: 'confirmation', message: 'confirm?' } };
    const { run } = setup({ handlerReturn });

    await expect(run()).resolves.toBe(handlerReturn);
  });
});
