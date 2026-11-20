/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServerMock } from '@kbn/core/server/mocks';
import type { PluginStartContract as ActionsPluginStart } from '@kbn/actions-plugin/server';
import { ToolType } from '@kbn/agent-builder-common/tools/definition';
import { createSandboxCallbackHandler } from './kibana_callbacks';
import type { SandboxCallContext } from './tool_utils';

const tool = (id: string, overrides: Record<string, unknown> = {}) => ({
  id,
  type: ToolType.builtin,
  annotations: { readOnlyHint: true, destructiveHint: false },
  ...overrides,
});

const setup = ({
  actionTypeId = '.abuseipdb',
  config = {},
}: { actionTypeId?: string; config?: Record<string, unknown> } = {}) => {
  const runTool = jest.fn();
  const execute = jest.fn().mockResolvedValue({ status: 'ok', data: { abuseConfidenceScore: 0 } });
  const actions = {
    getActionsClientWithRequest: jest.fn().mockResolvedValue({
      get: jest
        .fn()
        .mockResolvedValue({ id: 'abuse', actionTypeId, config, isSystemAction: false }),
      execute,
    }),
    getActionsAuthorizationWithRequest: jest.fn(() => ({
      ensureAuthorized: jest.fn().mockResolvedValue(undefined),
    })),
  } as unknown as ActionsPluginStart;
  const callContext: SandboxCallContext = {
    request: httpServerMock.createKibanaRequest(),
    allowedConnectorIds: ['abuse'],
    resolvedCredentials: new Map(),
  };
  const toolRegistry = {
    list: jest.fn().mockResolvedValue([
      tool('platform.core.execute_esql', { confirmation: { askUser: 'never' } }),
      tool('platform.core.index_explorer'),
      tool('platform.core.cases_write', { annotations: { readOnlyHint: false } }),
      tool('platform.core.create_visualization'),
      tool('nightshift_sandbox_bash'),
      tool('platform.core.confirmed', { confirmation: { askUser: 'always' } }),
      tool('platform.core.dynamic', {
        confirmation: { askUser: 'never', getConfirmation: jest.fn() },
      }),
    ]),
  };
  const handler = createSandboxCallbackHandler({
    runner: { runTool },
    callContext,
    actions,
    toolRegistry: toolRegistry as never,
  });
  return { handler, runTool, execute };
};

describe('createSandboxCallbackHandler', () => {
  it.each([
    'platform.core.cases_write',
    'platform.core.create_visualization',
    'nightshift_sandbox_bash',
    'platform.core.confirmed',
    'platform.core.dynamic',
    'platform.core.unknown',
  ])('refuses %s, which is not a read-only scriptable tool, without running it', async (toolId) => {
    const { handler, runTool } = setup();

    const result = await handler({ target: { type: 'tool', toolId }, params: {} });

    expect(result).toEqual({
      ok: false,
      errorMessage: expect.stringContaining(`Tool '${toolId}' cannot be called`),
    });
    expect(runTool).not.toHaveBeenCalled();
  });

  it('runs a read-only tool that never asks for confirmation', async () => {
    const { handler, runTool } = setup();
    runTool.mockResolvedValue({ results: [] });

    await expect(
      handler({ target: { type: 'tool', toolId: 'platform.core.execute_esql' }, params: {} })
    ).resolves.toEqual({ ok: true, result: { results: [] } });
    expect(runTool).toHaveBeenCalledTimes(1);
  });

  it('runs a read-only tool of the registry', async () => {
    const { handler, runTool } = setup();
    runTool.mockResolvedValue({ results: [{ type: 'other', data: { index: 'logs' } }] });

    await expect(
      handler({ target: { type: 'tool', toolId: 'platform.core.index_explorer' }, params: {} })
    ).resolves.toEqual({
      ok: true,
      result: { results: [{ type: 'other', data: { index: 'logs' } }] },
    });
  });

  it('reports the error results of a tool as a failed call', async () => {
    const { handler, runTool } = setup();
    runTool.mockResolvedValue({
      results: [{ type: 'error', data: { message: 'Unknown column [foo]' } }],
    });

    await expect(
      handler({
        target: { type: 'tool', toolId: 'platform.core.execute_esql' },
        params: { query: 'FROM logs | KEEP foo' },
      })
    ).resolves.toEqual({ ok: false, errorMessage: '[{"message":"Unknown column [foo]"}]' });
  });

  it('runs a tool sub-action of an assigned connector with its parameters', async () => {
    const { handler, execute } = setup();

    await expect(
      handler({
        target: { type: 'connector', connectorId: 'abuse', subAction: 'checkIp' },
        params: { ipAddress: '1.2.3.4' },
      })
    ).resolves.toEqual({ ok: true, result: { abuseConfidenceScore: 0 } });
    expect(execute).toHaveBeenCalledWith({
      actionId: 'abuse',
      params: { subAction: 'checkIp', subActionParams: { ipAddress: '1.2.3.4' } },
    });
  });

  it('refuses a connector that is not assigned to the agent', async () => {
    const { handler, execute } = setup();

    const result = await handler({
      target: { type: 'connector', connectorId: 'other', subAction: 'checkIp' },
      params: {},
    });

    expect(result).toEqual({
      ok: false,
      errorMessage: expect.stringContaining("Connector 'other' is not assigned to this agent"),
    });
    expect(execute).not.toHaveBeenCalled();
  });

  it('refuses a sub-action that its connector spec does not mark as a tool', async () => {
    const { handler, execute } = setup({ actionTypeId: '.webhook' });

    const result = await handler({
      target: { type: 'connector', connectorId: 'abuse', subAction: 'run' },
      params: {},
    });

    expect(result).toEqual({
      ok: false,
      errorMessage: expect.stringContaining("Sub-action 'run' cannot be called"),
    });
    expect(execute).not.toHaveBeenCalled();
  });

  it('refuses a sub-action that is not enabled on the connector', async () => {
    const { handler, execute } = setup({ config: { selectedActions: ['_test'] } });

    const result = await handler({
      target: { type: 'connector', connectorId: 'abuse', subAction: 'checkIp' },
      params: {},
    });

    expect(result).toEqual({
      ok: false,
      errorMessage: expect.stringContaining(
        "Sub-action 'checkIp' is not enabled on connector 'abuse'"
      ),
    });
    expect(execute).not.toHaveBeenCalled();
  });
});
