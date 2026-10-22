/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { httpServerMock, loggingSystemMock } from '@kbn/core/server/mocks';
import { actionsClientMock } from '@kbn/actions-plugin/server/mocks';
import type { PluginStartContract as ActionsPluginStart } from '@kbn/actions-plugin/server';
import { ToolResultType } from '@kbn/agent-builder-common/tools/tool_result';
import type { BuiltinToolDefinition } from '@kbn/agent-builder-server';
import { resolveSandboxCredentials } from './connector_credentials';
import { REDACTED_PLACEHOLDER } from './output_redactor';
import {
  createSandboxOutputRedactorProvider,
  withSandboxOutputRedaction,
} from './sandbox_output_redaction';

const STORED_SECRET = 'stored-sandbox-secret';
const CONNECTOR_SECRET = 'connector-api-key-123';
const SAVED_CONNECTOR_ID = 'saved-1';
const SAVED_CONNECTOR_TOKEN = 'saved-connector-token-value';
const SAVED_CONNECTOR_AUTHORIZATION = `Bearer ${SAVED_CONNECTOR_TOKEN}`;

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
  allowedConnectorIds = [],
}: {
  getRedactionValues?: jest.Mock;
  handlerReturn?: unknown;
  allowedConnectorIds?: string[];
} = {}) => {
  const handler = jest.fn().mockResolvedValue(handlerReturn);
  const tool = { id: 'sandbox_tool', schema, handler } as unknown as BuiltinToolDefinition<
    typeof schema
  >;
  const actionsClient = actionsClientMock.create();
  actionsClient.getSandboxCredentials.mockImplementation(async ({ id }) => {
    if (id !== SAVED_CONNECTOR_ID) throw new Error(`Unauthorized to execute connector ${id}`);
    return {
      connectorId: id,
      actionTypeId: '.http',
      config: { url: 'https://api.example.com' },
      headers: { Authorization: SAVED_CONNECTOR_AUTHORIZATION },
    };
  });
  actionsClient.getAll.mockImplementation(
    async () =>
      allowedConnectorIds.map((id) => ({
        id,
        name: id,
        actionTypeId: '.http',
      })) as Awaited<ReturnType<typeof actionsClient.getAll>>
  );
  const actions = {
    inMemoryConnectors: [{ id: 'c1', secrets: { apiKey: CONNECTOR_SECRET } }],
    getActionsClientWithRequest: jest.fn().mockResolvedValue(actionsClient),
  } as unknown as ActionsPluginStart;
  const logger = loggingSystemMock.createLogger();
  const wrapped = withSandboxOutputRedaction(tool, {
    getOutputRedactor: createSandboxOutputRedactorProvider({
      getDeps: () => ({ actions, sandboxSecretsClient: { getRedactionValues } }),
    }),
    logger,
  });
  const request = httpServerMock.createKibanaRequest();
  // Each run gets a fresh handler context, as agent builder creates one per tool call.
  const run = () =>
    (wrapped.handler as unknown as (p: unknown, c: unknown) => Promise<unknown>)(
      {},
      { request, agentConfiguration: { connector_ids: allowedConnectorIds } }
    );

  return { run, handler, getRedactionValues, logger, request, actionsClient, actions };
};

const resultWithStdout = (stdout: string) => ({
  results: [{ type: ToolResultType.other, data: { stdout } }],
});

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
    const emptyActionsClient = actionsClientMock.create();
    emptyActionsClient.getAll.mockResolvedValue([]);
    const actions = {
      inMemoryConnectors: [
        { id: 'c1', secrets: { secretHeaders: { Authorization: `ApiKey ${apiKey}` } } },
      ],
      getActionsClientWithRequest: jest.fn().mockResolvedValue(emptyActionsClient),
    } as unknown as ActionsPluginStart;
    const handler = jest.fn().mockResolvedValue({
      results: [{ type: ToolResultType.other, data: { stdout: apiKey } }],
    });
    const tool = { id: 'sandbox_tool', schema, handler } as unknown as BuiltinToolDefinition<
      typeof schema
    >;
    const logger = loggingSystemMock.createLogger();
    const wrapped = withSandboxOutputRedaction(tool, {
      getOutputRedactor: createSandboxOutputRedactorProvider({
        getDeps: () => ({
          actions,
          sandboxSecretsClient: { getRedactionValues: jest.fn().mockResolvedValue([]) },
        }),
      }),
      logger,
    });
    const request = httpServerMock.createKibanaRequest();

    await expect(
      (wrapped.handler as unknown as (p: unknown, c: unknown) => Promise<unknown>)({}, { request })
    ).resolves.toEqual({
      results: [{ type: ToolResultType.other, data: { stdout: REDACTED_PLACEHOLDER } }],
    });
  });

  it('redacts a saved connector credential in the call that injected it and in a later call', async () => {
    const { run, handler, actionsClient } = setup({
      allowedConnectorIds: [SAVED_CONNECTOR_ID],
      handlerReturn: resultWithStdout(`curl -H '${SAVED_CONNECTOR_AUTHORIZATION}'`),
    });

    await expect(run()).resolves.toEqual(resultWithStdout(`curl -H '${REDACTED_PLACEHOLDER}'`));

    // A later call that injected nothing reads the bare token back from a file.
    handler.mockResolvedValueOnce(resultWithStdout(`token.txt: ${SAVED_CONNECTOR_TOKEN}`));
    await expect(run()).resolves.toEqual(resultWithStdout(`token.txt: ${REDACTED_PLACEHOLDER}`));

    expect(actionsClient.getSandboxCredentials).toHaveBeenCalledTimes(2);
    expect(actionsClient.getSandboxCredentials).toHaveBeenCalledWith({ id: SAVED_CONNECTOR_ID });
  });

  it('shares one saved connector lookup between the redactor and the wrapped tool', async () => {
    const { run, handler, actionsClient, actions } = setup({
      allowedConnectorIds: [SAVED_CONNECTOR_ID],
    });
    handler.mockImplementationOnce(async (_params, { sandboxCallContext }) => {
      await resolveSandboxCredentials({
        actions,
        callContext: sandboxCallContext,
        connectorId: SAVED_CONNECTOR_ID,
      });
      return resultWithStdout('done');
    });

    await run();

    expect(handler).toHaveBeenCalledWith(
      {},
      expect.objectContaining({
        sandboxCallContext: expect.objectContaining({ allowedConnectorIds: [SAVED_CONNECTOR_ID] }),
      })
    );
    expect(actionsClient.getSandboxCredentials).toHaveBeenCalledTimes(1);
  });

  it('does not resolve an allow-listed connector that is not sandbox capable and still runs the tool', async () => {
    const { run, handler, logger, actionsClient } = setup({
      allowedConnectorIds: ['slack-1', SAVED_CONNECTOR_ID],
      handlerReturn: resultWithStdout(SAVED_CONNECTOR_TOKEN),
    });
    actionsClient.getAll.mockResolvedValue([
      { id: SAVED_CONNECTOR_ID, name: 'saved', actionTypeId: '.http' },
    ] as Awaited<ReturnType<typeof actionsClient.getAll>>);

    await expect(run()).resolves.toEqual(resultWithStdout(REDACTED_PLACEHOLDER));

    expect(handler).toHaveBeenCalledTimes(1);
    expect(actionsClient.getAll).toHaveBeenCalledWith(
      expect.objectContaining({ sandboxCapableOnly: true })
    );
    expect(actionsClient.getSandboxCredentials).not.toHaveBeenCalledWith({ id: 'slack-1' });
    expect(logger.error).not.toHaveBeenCalled();
  });

  it('does not run the tool when a sandbox capable connector cannot be resolved', async () => {
    const { run, handler, logger } = setup({ allowedConnectorIds: ['broken-1'] });

    await expect(run()).resolves.toEqual({
      results: [
        {
          type: ToolResultType.error,
          data: { message: expect.stringContaining("connector 'broken-1' assigned to this agent") },
        },
      ],
    });
    expect(handler).not.toHaveBeenCalled();
    expect(logger.error).toHaveBeenCalledTimes(1);
    expect(logger.error).toHaveBeenCalledWith(
      expect.stringContaining('Resolving connector credentials for output redaction failed')
    );
  });

  it('does not run the tool when the sandbox capable connectors cannot be listed', async () => {
    const { run, handler, logger, actionsClient } = setup({
      allowedConnectorIds: [SAVED_CONNECTOR_ID],
    });
    actionsClient.getAll.mockRejectedValue(new Error('es unavailable'));

    await expect(run()).resolves.toEqual({
      results: [
        {
          type: ToolResultType.error,
          data: {
            message: expect.stringContaining(
              'connectors assigned to this agent could not be listed'
            ),
          },
        },
      ],
    });
    expect(handler).not.toHaveBeenCalled();
    expect(logger.error).toHaveBeenCalledTimes(1);
  });

  it('does not create an actions client when the allow list is empty', async () => {
    const { run, handler, actions } = setup({ allowedConnectorIds: [] });

    await run();

    expect(handler).toHaveBeenCalledTimes(1);
    expect(actions.getActionsClientWithRequest).not.toHaveBeenCalled();
  });

  it('resolves an allow-listed in-memory connector through Actions once', async () => {
    const { run, actionsClient } = setup({ allowedConnectorIds: ['c1', 'c1'] });

    await run();

    expect(actionsClient.getSandboxCredentials).toHaveBeenCalledTimes(1);
    expect(actionsClient.getSandboxCredentials).toHaveBeenCalledWith({ id: 'c1' });
  });

  it('does not resolve an in-memory connector that is not allow-listed', async () => {
    const { run, actionsClient } = setup({ allowedConnectorIds: [SAVED_CONNECTOR_ID] });

    await run();

    expect(actionsClient.getSandboxCredentials).not.toHaveBeenCalledWith({ id: 'c1' });
  });

  it('redacts a derived header value of an allow-listed in-memory connector in a later call', async () => {
    const basicToken = 'dXNlcjpwYXNzd29yZC1sb25nLWVub3VnaA==';
    const { run, handler, actionsClient } = setup({ allowedConnectorIds: ['c1'] });
    actionsClient.getSandboxCredentials.mockResolvedValue({
      connectorId: 'c1',
      actionTypeId: '.http',
      config: { url: 'https://api.example.com' },
      headers: { Authorization: `Basic ${basicToken}` },
    });

    // A call that injected nothing reads the header value back from a file.
    handler.mockResolvedValueOnce(
      resultWithStdout(`header.txt: Basic ${basicToken}\ntoken.txt: ${basicToken}`)
    );

    await expect(run()).resolves.toEqual(
      resultWithStdout(`header.txt: ${REDACTED_PLACEHOLDER}\ntoken.txt: ${REDACTED_PLACEHOLDER}`)
    );
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
