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
import {
  createSandboxBashTool,
  MAX_INLINE_OUTPUT_CHARS,
  MAX_SANDBOX_COMMAND_TIMEOUT_SECONDS,
} from './tool';

const GITHUB_TOKEN = 'ghp_sandbox_secret_value';

const setup = ({
  resolveConnectorCredentials,
  stdout = '',
}: {
  resolveConnectorCredentials?: ResolveConnectorCredentials;
  stdout?: string;
} = {}) => {
  const runCommand = jest.fn().mockResolvedValue({
    exit_code: 0,
    timed_out: false,
    stdout,
    stderr: '',
  });
  const mkdirs = jest.fn().mockResolvedValue([true]);
  const writeFiles = jest.fn().mockResolvedValue([{ success: true }]);
  const session = { runCommand, mkdirs, writeFiles } as unknown as SandboxSession;
  const sandboxStart = {
    getSession: jest.fn(() => session),
  } as unknown as SandboxPluginStart;
  const sandboxWorkspaceManager = {
    ensureWorkspaceReady: jest.fn().mockResolvedValue(undefined),
  } as unknown as SandboxWorkspaceManager;
  const logger = loggingSystemMock.createLogger();

  const tool = createSandboxBashTool({
    getSandboxStart: () => sandboxStart,
    sandboxWorkspaceManager,
    resolveConnectorCredentials,
    logger,
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

  return { tool, run, runCommand, writeFiles, request, logger, session };
};

describe('sandbox bash tool', () => {
  it('is not exposed over MCP', () => {
    const { tool } = setup();

    expect(tool.excludeFromMcp).toBe(true);
  });

  it('logs only the error type, never the error message, when the sandbox call throws', async () => {
    const { run, runCommand, logger } = setup({ stdout: '' });
    runCommand.mockRejectedValue(new Error(`boom while handling ${GITHUB_TOKEN}`));

    await run({});

    expect(logger.error).toHaveBeenCalledTimes(1);
    const [loggedMessage] = logger.error.mock.calls[0];
    expect(loggedMessage).not.toContain(GITHUB_TOKEN);
    expect(loggedMessage).not.toContain('boom while handling');
    expect(loggedMessage).toContain('Error');
  });
});

describe('sandbox bash tool — connector credentials', () => {
  const resolved = (): ResolveConnectorCredentials =>
    jest.fn().mockResolvedValue({
      env: { CONNECTOR_HEADER_AUTHORIZATION: GITHUB_TOKEN, CONNECTOR_CONFIG_URL: 'https://gh' },
      secretValues: [GITHUB_TOKEN],
    });

  it('resolves the connector for the calling user and passes its credentials to the command', async () => {
    const resolveConnectorCredentials = resolved();
    const { run, runCommand, request } = setup({ resolveConnectorCredentials });

    await run({ connector_id: 'connector-1' });

    expect(resolveConnectorCredentials).toHaveBeenCalledWith(
      'connector-1',
      expect.objectContaining({ request, allowedConnectorIds: ['connector-1'] })
    );
    expect(runCommand.mock.calls[0][0].env).toEqual(
      expect.objectContaining({
        CONNECTOR_HEADER_AUTHORIZATION: GITHUB_TOKEN,
        CONNECTOR_CONFIG_URL: 'https://gh',
      })
    );
  });

  it('does not let agent-supplied env shadow the credentials', async () => {
    const { run, runCommand } = setup({ resolveConnectorCredentials: resolved() });

    await run({
      connector_id: 'connector-1',
      env: { CONNECTOR_HEADER_AUTHORIZATION: 'agent-value', FOO: 'bar' },
    });

    const { env } = runCommand.mock.calls[0][0];
    expect(env.CONNECTOR_HEADER_AUTHORIZATION).toBe(GITHUB_TOKEN);
    expect(env.FOO).toBe('bar');
  });

  it('passes no credentials without a connector_id', async () => {
    const resolveConnectorCredentials = resolved();
    const { run, runCommand } = setup({ resolveConnectorCredentials });

    await run({});

    expect(resolveConnectorCredentials).not.toHaveBeenCalled();
    expect(runCommand.mock.calls[0][0].env).not.toHaveProperty('CONNECTOR_HEADER_AUTHORIZATION');
  });

  it('redacts the secret from stdout and stderr of a successful command', async () => {
    const { run, runCommand } = setup({ resolveConnectorCredentials: resolved() });
    runCommand.mockResolvedValue({
      exit_code: 0,
      timed_out: false,
      stdout: `token=${GITHUB_TOKEN}`,
      stderr: `warn ${GITHUB_TOKEN}`,
    });

    const { results } = await run({ connector_id: 'connector-1' });

    expect(results).toEqual([
      {
        type: ToolResultType.other,
        data: { stdout: 'token=[REDACTED]', stderr: 'warn [REDACTED]', exit_code: 0 },
      },
    ]);
  });

  it('redacts the secret from the error message of a failed command', async () => {
    const { run, runCommand } = setup({ resolveConnectorCredentials: resolved() });
    runCommand.mockResolvedValue({
      exit_code: 1,
      timed_out: false,
      stdout: '',
      stderr: `401 for ${GITHUB_TOKEN}`,
    });

    const { results } = await run({ connector_id: 'connector-1' });

    const { message } = (results[0] as { data: { message: string } }).data;
    expect(message).not.toContain(GITHUB_TOKEN);
    expect(message).toContain('401 for [REDACTED]');
  });

  it('returns the resolver error and runs nothing when the connector cannot be used', async () => {
    const resolveConnectorCredentials: ResolveConnectorCredentials = jest.fn().mockResolvedValue({
      errorMessage: 'Connector "connector-2" is not assigned to this agent.',
    });
    const { run, runCommand } = setup({ resolveConnectorCredentials });

    const { results } = await run({ connector_id: 'connector-2' });

    expect(results).toEqual([
      {
        type: ToolResultType.error,
        data: { message: 'Connector "connector-2" is not assigned to this agent.' },
      },
    ]);
    expect(runCommand).not.toHaveBeenCalled();
  });

  it('returns an error when connector credentials are not available in the deployment', async () => {
    const { run, runCommand } = setup();

    const { results } = await run({ connector_id: 'connector-1' });

    expect(results).toEqual([
      {
        type: ToolResultType.error,
        data: { message: 'Connector credentials are not available in this deployment.' },
      },
    ]);
    expect(runCommand).not.toHaveBeenCalled();
  });
});

describe('sandbox bash tool — command timeout', () => {
  it.each([
    ['omitted', undefined, MAX_SANDBOX_COMMAND_TIMEOUT_SECONDS],
    ['zero', 0, MAX_SANDBOX_COMMAND_TIMEOUT_SECONDS],
    ['below the cap', 60, 60],
    ['above the cap', 600, MAX_SANDBOX_COMMAND_TIMEOUT_SECONDS],
  ])('uses a bounded timeout when the requested timeout is %s', async (_, requested, expected) => {
    const { run, runCommand } = setup();

    await run(requested === undefined ? {} : { timeout_seconds: requested });

    expect(runCommand.mock.calls[0][0].timeout_seconds).toBe(expected);
  });
});

describe('sandbox bash tool — output size', () => {
  const longOutput = `HEAD${'x'.repeat(MAX_INLINE_OUTPUT_CHARS * 2)}TAIL`;

  it('returns output within the limit unchanged and saves nothing', async () => {
    const stdout = 'y'.repeat(MAX_INLINE_OUTPUT_CHARS);
    const { run, writeFiles } = setup({ stdout });

    const { results } = await run({});

    expect(results).toEqual([
      { type: ToolResultType.other, data: { stdout, stderr: '', exit_code: 0 } },
    ]);
    expect(writeFiles).not.toHaveBeenCalled();
  });

  it('saves long redacted output to a file and returns its head and tail', async () => {
    const stdout = `${GITHUB_TOKEN}${longOutput}`;
    const resolveConnectorCredentials: ResolveConnectorCredentials = jest.fn().mockResolvedValue({
      env: { CONNECTOR_HEADER_AUTHORIZATION: GITHUB_TOKEN },
      secretValues: [GITHUB_TOKEN],
    });
    const { run, writeFiles } = setup({ stdout, resolveConnectorCredentials });

    const { results } = await run({ connector_id: 'connector-1' });

    const [[{ path, content }]] = writeFiles.mock.calls[0];
    expect(path).toMatch(/^\/workspace\/\.tool-output\/.+\.stdout\.txt$/);
    expect(content.toString('utf8')).toBe(`[REDACTED]${longOutput}`);

    const returned = (results[0] as { data: { stdout: string } }).data.stdout;
    expect(returned.length).toBeLessThan(MAX_INLINE_OUTPUT_CHARS);
    expect(returned.startsWith('[REDACTED]HEAD')).toBe(true);
    expect(returned.endsWith('TAIL')).toBe(true);
    expect(returned).toContain(`full stdout saved to ${path}`);
  });

  it('truncates long output in the error message of a failed command', async () => {
    const { run, runCommand } = setup();
    runCommand.mockResolvedValue({
      exit_code: 1,
      timed_out: false,
      stdout: '',
      stderr: longOutput,
    });

    const { results } = await run({});

    const { message } = (results[0] as { data: { message: string } }).data;
    expect(message.length).toBeLessThan(MAX_INLINE_OUTPUT_CHARS);
    expect(message).toContain('full stderr saved to /workspace/.tool-output/');
  });

  it('still truncates when the full output cannot be saved', async () => {
    const { run, writeFiles } = setup({ stdout: longOutput });
    writeFiles.mockResolvedValue([{ success: false }]);

    const { results } = await run({});

    const returned = (results[0] as { data: { stdout: string } }).data.stdout;
    expect(returned.length).toBeLessThan(MAX_INLINE_OUTPUT_CHARS);
    expect(returned).toContain('full stdout could not be saved');
  });

  it('suggests redirecting output when the sandbox transport rejects it as too large', async () => {
    const { run, runCommand } = setup();
    runCommand.mockRejectedValue(
      new Error('8 RESOURCE_EXHAUSTED: Received message larger than max')
    );

    const { results } = await run({});

    expect((results[0] as { data: { message: string } }).data.message).toContain(
      'redirect it to a file'
    );
  });
});
