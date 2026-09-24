/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServerMock, loggingSystemMock } from '@kbn/core/server/mocks';
import { ToolResultType } from '@kbn/agent-builder-common/tools/tool_result';
import type { SandboxPluginStart, SandboxSession } from '@kbn/sandbox-plugin/server';
import type { SandboxWorkspaceManager } from './sandbox_workspace_manager';
import type { ResolveConnectorCredentials } from './connector_credentials';
import { createSandboxBashTool } from './tool';

const GITHUB_TOKEN = 'ghp_sandbox_secret_value';
const CONNECTOR_TOKEN = 'connector-secret-token';

const setup = ({
  resolveForCommand = jest.fn().mockResolvedValue({
    env: { GITHUB_TOKEN },
    secretValues: [GITHUB_TOKEN],
  }),
  resolveConnectorCredentials,
  stdout = '',
}: {
  resolveForCommand?: jest.Mock;
  resolveConnectorCredentials?: ResolveConnectorCredentials;
  stdout?: string;
} = {}) => {
  const runCommand = jest.fn().mockResolvedValue({
    exit_code: 0,
    timed_out: false,
    stdout,
    stderr: '',
  });
  const session = { runCommand } as unknown as SandboxSession;
  const sandboxStart = {
    getSession: jest.fn(() => session),
  } as unknown as SandboxPluginStart;
  const sandboxWorkspaceManager = {
    ensureWorkspaceReady: jest.fn().mockResolvedValue(undefined),
  } as unknown as SandboxWorkspaceManager;

  const tool = createSandboxBashTool({
    getSandboxStart: () => sandboxStart,
    sandboxWorkspaceManager,
    resolveConnectorCredentials,
    sandboxSecretsClient: { resolveForCommand },
    logger: loggingSystemMock.createLogger(),
  });

  const request = httpServerMock.createKibanaRequest();
  const context = {
    request,
    runContext: { stack: [{ type: 'agent', agentId: 'agent', conversationId: 'conv-1' }] },
    agentConfiguration: { connector_ids: ['connector-1'] },
  };

  const run = (params: Record<string, unknown>) =>
    (tool.handler as unknown as (p: unknown, c: unknown) => Promise<{ results: unknown[] }>)(
      { command: 'echo hi', ...params },
      context
    );

  return { tool, run, runCommand, resolveForCommand, request };
};

describe('sandbox bash tool — sandbox secrets', () => {
  it('does not resolve secrets when none are requested', async () => {
    const { run, runCommand, resolveForCommand } = setup();

    await run({});

    expect(resolveForCommand).not.toHaveBeenCalled();
    expect(runCommand.mock.calls[0][0].env).not.toHaveProperty('GITHUB_TOKEN');
  });

  it('injects requested secrets into the command environment only', async () => {
    const { run, runCommand, resolveForCommand, request } = setup();

    await run({ secret_keys: ['GITHUB_TOKEN'] });

    expect(resolveForCommand).toHaveBeenCalledWith(request, ['GITHUB_TOKEN']);
    expect(runCommand.mock.calls[0][0].env).toMatchObject({ GITHUB_TOKEN });
  });

  it('applies secrets over agent env and connector credentials over secrets', async () => {
    const resolveForCommand = jest.fn().mockResolvedValue({
      env: { GITHUB_TOKEN, SHARED: 'from-secret' },
      secretValues: [GITHUB_TOKEN],
    });
    const resolveConnectorCredentials: ResolveConnectorCredentials = jest.fn().mockResolvedValue({
      env: { SHARED: 'from-connector', CONNECTOR_SECRET_TOKEN: CONNECTOR_TOKEN },
      secretValues: [CONNECTOR_TOKEN],
    });
    const { run, runCommand } = setup({ resolveForCommand, resolveConnectorCredentials });

    await run({
      env: { GITHUB_TOKEN: 'agent-override', SHARED: 'from-agent' },
      connector_id: 'connector-1',
      secret_keys: ['GITHUB_TOKEN', 'SHARED'],
    });

    expect(runCommand.mock.calls[0][0].env).toMatchObject({
      GITHUB_TOKEN,
      SHARED: 'from-connector',
      CONNECTOR_SECRET_TOKEN: CONNECTOR_TOKEN,
    });
  });

  it('redacts both connector credentials and sandbox secrets from output', async () => {
    const resolveConnectorCredentials: ResolveConnectorCredentials = jest.fn().mockResolvedValue({
      env: { CONNECTOR_SECRET_TOKEN: CONNECTOR_TOKEN },
      secretValues: [CONNECTOR_TOKEN],
    });
    const { run } = setup({
      resolveConnectorCredentials,
      stdout: `${GITHUB_TOKEN} ${CONNECTOR_TOKEN}`,
    });

    const { results } = await run({ connector_id: 'connector-1', secret_keys: ['GITHUB_TOKEN'] });
    const serialized = JSON.stringify(results);

    expect(serialized).not.toContain(GITHUB_TOKEN);
    expect(serialized).not.toContain(CONNECTOR_TOKEN);
    expect(serialized).toContain('[REDACTED] [REDACTED]');
  });

  it('returns a tool error and does not run the command when a secret cannot be resolved', async () => {
    const resolveForCommand = jest
      .fn()
      .mockResolvedValue({ errorMessage: 'Unknown sandbox secret(s): MISSING' });
    const { run, runCommand } = setup({ resolveForCommand });

    const { results } = await run({ secret_keys: ['MISSING'] });

    expect(results).toEqual([
      { type: ToolResultType.error, data: { message: 'Unknown sandbox secret(s): MISSING' } },
    ]);
    expect(runCommand).not.toHaveBeenCalled();
  });

  it('is not exposed over MCP', () => {
    const { tool } = setup();

    expect(tool.excludeFromMcp).toBe(true);
  });
});
