/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServerMock, loggingSystemMock } from '@kbn/core/server/mocks';
import { ToolResultType } from '@kbn/agent-builder-common/tools/tool_result';
import type { AuditedSandboxSession, NightshiftSandboxStart } from '../../sandbox_audit';
import type { SandboxWorkspaceManager } from './sandbox_workspace_manager';
import type { ResolveConnectorCredentials } from './connector_credentials';
import { buildConnectorEnv } from './connector_credentials';
import {
  createSandboxBashTool,
  MAX_INLINE_OUTPUT_CHARS,
  MAX_SANDBOX_COMMAND_TIMEOUT_SECONDS,
} from './tool';

const GITHUB_TOKEN = 'ghp_sandbox_secret_value';

const setup = ({
  resolveConnectorCredentials,
  allowedHosts = [],
  stdout = '',
}: {
  resolveConnectorCredentials?: ResolveConnectorCredentials;
  allowedHosts?: string[];
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
  const session = { runCommand, mkdirs, writeFiles } as unknown as AuditedSandboxSession;
  const sandboxStart = {
    getSession: jest.fn(() => session),
  } as unknown as NightshiftSandboxStart;
  const sandboxWorkspaceManager = {
    ensureWorkspaceReady: jest.fn().mockResolvedValue(undefined),
  } as unknown as SandboxWorkspaceManager;
  const sandboxAllowlistClient = {
    getHostsForCommand: jest.fn().mockResolvedValue(allowedHosts),
  };
  const logger = loggingSystemMock.createLogger();

  const tool = createSandboxBashTool({
    getSandboxStart: () => sandboxStart,
    sandboxWorkspaceManager,
    resolveConnectorCredentials,
    sandboxAllowlistClient,
    logger,
  });

  const request = httpServerMock.createKibanaRequest();
  const context = {
    request,
    runContext: { stack: [{ type: 'agent', agentId: 'agent', conversationId: 'conv-1' }] },
    callContext: { toolId: 'nightshift_sandbox_bash', toolCallId: 'call-1', callSource: 'agent' },
    agentConfiguration: { connector_ids: ['connector-1'] },
  };

  const run = (params: Record<string, unknown>) =>
    (tool.handler as unknown as (p: unknown, c: unknown) => Promise<{ results: unknown[] }>)(
      { command: 'echo hi', ...params },
      context
    );

  return {
    tool,
    run,
    runCommand,
    writeFiles,
    request,
    logger,
    session,
    sandboxStart,
    sandboxAllowlistClient,
  };
};

describe('sandbox bash tool', () => {
  it('is not exposed over MCP', () => {
    const { tool } = setup();

    expect(tool.excludeFromMcp).toBe(true);
  });

  it('names the tool and this call of it when it obtains the session, so its RPCs are audited', async () => {
    const { run, request, sandboxStart } = setup();

    await run({});

    expect(sandboxStart.getSession).toHaveBeenCalledWith(request, 'conv-1', {
      type: 'tool',
      toolId: 'nightshift_sandbox_bash',
      toolCallId: 'call-1',
    });
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
    jest.fn().mockResolvedValue(
      buildConnectorEnv({
        connectorId: 'connector-1',
        actionTypeId: '.github',
        config: { url: 'https://gh' },
        headers: { Authorization: GITHUB_TOKEN },
        hosts: ['api.github.com'],
      })
    );

  it('resolves a single connector for the calling user and always namespaces its credentials', async () => {
    const resolveConnectorCredentials = resolved();
    const { run, runCommand, request } = setup({ resolveConnectorCredentials });

    await run({ connector_ids: ['connector-1'] });

    expect(resolveConnectorCredentials).toHaveBeenCalledWith(
      'connector-1',
      expect.objectContaining({ request, allowedConnectorIds: ['connector-1'] })
    );
    expect(runCommand.mock.calls[0][0].env).toEqual(
      expect.objectContaining({
        CONNECTOR_CONNECTOR_1_ID: 'connector-1',
        CONNECTOR_CONNECTOR_1_TYPE: '.github',
        CONNECTOR_CONNECTOR_1_HEADER_AUTHORIZATION: GITHUB_TOKEN,
        CONNECTOR_CONNECTOR_1_CONFIG_URL: 'https://gh',
      })
    );
  });

  it('does not let agent-supplied env shadow the credentials', async () => {
    const { run, runCommand } = setup({ resolveConnectorCredentials: resolved() });

    await run({
      connector_ids: ['connector-1'],
      env: { CONNECTOR_CONNECTOR_1_HEADER_AUTHORIZATION: 'agent-value', FOO: 'bar' },
    });

    const { env } = runCommand.mock.calls[0][0];
    expect(env.CONNECTOR_CONNECTOR_1_HEADER_AUTHORIZATION).toBe(GITHUB_TOKEN);
    expect(env.FOO).toBe('bar');
  });

  it('allows connector hosts while keeping header secrets bound only to those hosts', async () => {
    const { run, runCommand } = setup({
      resolveConnectorCredentials: resolved(),
      allowedHosts: ['other.example.com'],
    });

    await run({ connector_ids: ['connector-1'] });

    expect(runCommand.mock.calls[0][0].secret_env_keys).toEqual([
      { key: 'CONNECTOR_CONNECTOR_1_HEADER_AUTHORIZATION', allowed_hosts: ['api.github.com'] },
    ]);
    expect(runCommand.mock.calls[0][0].allowed_hosts).toEqual([
      'other.example.com',
      'api.github.com',
    ]);
  });

  it('allows connector hosts without auth headers', async () => {
    const resolveConnectorCredentials: ResolveConnectorCredentials = async () => ({
      env: { CONNECTOR_CONNECTOR_1_CONFIG_URL: 'https://api.example.com' },
      secretValues: [],
      secretEnvKeys: [],
      allowedHosts: ['api.example.com'],
    });
    const { run, runCommand } = setup({ resolveConnectorCredentials });

    await run({ connector_ids: ['connector-1'] });

    expect(runCommand.mock.calls[0][0].allowed_hosts).toEqual(['api.example.com']);
    expect(runCommand.mock.calls[0][0]).not.toHaveProperty('secret_env_keys');
  });

  it('deduplicates space and connector hosts while preserving space firewall rules', async () => {
    const { run, runCommand } = setup({
      resolveConnectorCredentials: resolved(),
      allowedHosts: [
        'allow * pypi.org GET,HEAD /simple/',
        'deny * api.github.com POST /gists',
        'api.github.com',
      ],
    });

    await run({ connector_ids: ['connector-1'] });

    expect(runCommand.mock.calls[0][0].allowed_hosts).toEqual([
      'allow * pypi.org GET,HEAD /simple/',
      'deny * api.github.com POST /gists',
      'api.github.com',
    ]);
  });

  it.each([
    { rule: 'allow https api.github.com:8443 GET /repos', authenticated: true, append: false },
    { rule: 'allow http api.github.com POST /gists', authenticated: false, append: false },
    { rule: 'allow https *.github.com:443 GET /repos', authenticated: true, append: false },
    { rule: 'allow * *.github.com:8443 * /repos', authenticated: false, append: false },
    { rule: '*.github.com', authenticated: false, append: false },
    { rule: 'allow https *.api.github.com:443 GET /repos', authenticated: false, append: true },
    { rule: 'allow https *.notgithub.com GET /repos', authenticated: true, append: true },
    { rule: 'deny https api.github.com:443 POST /gists', authenticated: true, append: true },
    { rule: 'deny * *.github.com:8443 * /repos', authenticated: false, append: true },
  ])(
    'preserves host-level policy $rule (authenticated=$authenticated)',
    async ({ rule, authenticated, append }) => {
      const secretEnvKeys = authenticated
        ? [{ key: 'CONNECTOR_CONNECTOR_1_HEADER_AUTHORIZATION', allowed_hosts: ['api.github.com'] }]
        : [];
      const env: Record<string, string> = authenticated
        ? { CONNECTOR_CONNECTOR_1_HEADER_AUTHORIZATION: GITHUB_TOKEN }
        : {};
      const { run, runCommand } = setup({
        allowedHosts: [rule],
        resolveConnectorCredentials: async () => ({
          env,
          secretValues: authenticated ? [GITHUB_TOKEN] : [],
          secretEnvKeys,
          allowedHosts: ['api.github.com'],
        }),
      });

      await run({ connector_ids: ['connector-1'] });

      expect(runCommand.mock.calls[0][0].allowed_hosts).toEqual(
        append ? [rule, 'api.github.com'] : [rule]
      );
      if (authenticated) {
        expect(runCommand.mock.calls[0][0].secret_env_keys).toEqual(secretEnvKeys);
      } else {
        expect(runCommand.mock.calls[0][0]).not.toHaveProperty('secret_env_keys');
      }
    }
  );

  it('logs the error and returns a structured tool error without running the command when getHostsForCommand rejects', async () => {
    const { run, runCommand, sandboxAllowlistClient, logger } = setup();
    sandboxAllowlistClient.getHostsForCommand.mockRejectedValueOnce(new Error('corrupted policy'));

    const res = await run({});

    expect(res).toEqual({
      results: [
        {
          type: ToolResultType.error,
          data: { message: 'Space sandbox egress allowlist is invalid or unavailable.' },
        },
      ],
    });
    expect(logger.error).toHaveBeenCalledWith(
      'Failed to load space sandbox egress allowlist: corrupted policy'
    );
    expect(runCommand).not.toHaveBeenCalled();
  });
  it.each([
    { allowedHosts: [], connectorIds: undefined },
    { allowedHosts: ['allow * pypi.org GET,HEAD /simple/'], connectorIds: [] },
  ])(
    'retains space-only egress policy $allowedHosts without selected connectors',
    async ({ allowedHosts, connectorIds }) => {
      const resolveConnectorCredentials = resolved();
      const { run, runCommand } = setup({ resolveConnectorCredentials, allowedHosts });

      await run(connectorIds === undefined ? {} : { connector_ids: connectorIds });

      expect(resolveConnectorCredentials).not.toHaveBeenCalled();
      expect(Object.keys(runCommand.mock.calls[0][0].env)).not.toEqual(
        expect.arrayContaining([expect.stringMatching(/^CONNECTOR_/)])
      );
      expect(runCommand.mock.calls[0][0]).not.toHaveProperty('secret_env_keys');
      if (allowedHosts.length > 0) {
        expect(runCommand.mock.calls[0][0].allowed_hosts).toEqual(allowedHosts);
      } else {
        expect(runCommand.mock.calls[0][0]).not.toHaveProperty('allowed_hosts');
      }
    }
  );

  it('redacts the secret from stdout and stderr of a successful command', async () => {
    const { run, runCommand } = setup({ resolveConnectorCredentials: resolved() });
    runCommand.mockResolvedValue({
      exit_code: 0,
      timed_out: false,
      stdout: `token=${GITHUB_TOKEN}`,
      stderr: `warn ${GITHUB_TOKEN}`,
    });

    const { results } = await run({ connector_ids: ['connector-1'] });

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

    const { results } = await run({ connector_ids: ['connector-1'] });

    const { message } = (results[0] as { data: { message: string } }).data;
    expect(message).not.toContain(GITHUB_TOKEN);
    expect(message).toContain('401 for [REDACTED]');
  });

  it('returns the resolver error and runs nothing when the connector cannot be used', async () => {
    const resolveConnectorCredentials: ResolveConnectorCredentials = jest.fn().mockResolvedValue({
      errorMessage: 'Connector "connector-2" is not assigned to this agent.',
    });
    const { run, runCommand } = setup({ resolveConnectorCredentials });

    const { results } = await run({ connector_ids: ['connector-2'] });

    expect(results).toEqual([
      {
        type: ToolResultType.error,
        data: {
          message:
            'Connector \'connector-2\': Connector "connector-2" is not assigned to this agent.',
        },
      },
    ]);
    expect(runCommand).not.toHaveBeenCalled();
  });

  it('returns an error when connector credentials are not available in the deployment', async () => {
    const { run, runCommand } = setup();

    const { results } = await run({ connector_ids: ['connector-1'] });

    expect(results).toEqual([
      {
        type: ToolResultType.error,
        data: {
          message: "Connector 'connector-1': credentials are not available in this deployment.",
        },
      },
    ]);
    expect(runCommand).not.toHaveBeenCalled();
  });
});

describe('sandbox bash tool — multiple connectors', () => {
  const SEARCH_TOKEN = 'search_secret_value';
  const resolveCredentials = jest.fn<
    ReturnType<ResolveConnectorCredentials>,
    Parameters<ResolveConnectorCredentials>
  >();

  beforeEach(() => {
    resolveCredentials.mockReset();
    resolveCredentials.mockImplementation(async (connectorId) =>
      buildConnectorEnv({
        connectorId,
        actionTypeId: connectorId === 'github-1' ? '.github' : '.elasticsearch',
        config: {
          apiUrl:
            connectorId === 'github-1' ? 'https://api.github.com' : 'https://search.example.com',
        },
        headers: { Authorization: connectorId === 'github-1' ? GITHUB_TOKEN : SEARCH_TOKEN },
        hosts: [connectorId === 'github-1' ? 'api.github.com' : 'search.example.com'],
      })
    );
  });

  it('injects both namespaces, keeps secrets host-bound, preserves space rules and redacts both streams', async () => {
    const spaceRule = 'allow https api.github.com:443 GET /repos';
    const { run, runCommand } = setup({
      resolveConnectorCredentials: resolveCredentials,
      allowedHosts: [spaceRule, 'other.example.com'],
    });
    runCommand.mockResolvedValue({
      exit_code: 0,
      timed_out: false,
      stdout: `${GITHUB_TOKEN} ${SEARCH_TOKEN}`,
      stderr: `${SEARCH_TOKEN} ${GITHUB_TOKEN}`,
    });

    const { results } = await run({
      connector_ids: ['github-1', 'search-1'],
      env: { CONNECTOR_GITHUB_1_HEADER_AUTHORIZATION: 'agent-value' },
    });

    expect(runCommand.mock.calls[0][0].env).toEqual(
      expect.objectContaining({
        CONNECTOR_GITHUB_1_ID: 'github-1',
        CONNECTOR_GITHUB_1_TYPE: '.github',
        CONNECTOR_GITHUB_1_CONFIG_APIURL: 'https://api.github.com',
        CONNECTOR_GITHUB_1_HEADER_AUTHORIZATION: GITHUB_TOKEN,
        CONNECTOR_SEARCH_1_ID: 'search-1',
        CONNECTOR_SEARCH_1_TYPE: '.elasticsearch',
        CONNECTOR_SEARCH_1_CONFIG_APIURL: 'https://search.example.com',
        CONNECTOR_SEARCH_1_HEADER_AUTHORIZATION: SEARCH_TOKEN,
      })
    );
    expect(runCommand.mock.calls[0][0].secret_env_keys).toEqual([
      { key: 'CONNECTOR_GITHUB_1_HEADER_AUTHORIZATION', allowed_hosts: ['api.github.com'] },
      { key: 'CONNECTOR_SEARCH_1_HEADER_AUTHORIZATION', allowed_hosts: ['search.example.com'] },
    ]);
    expect(runCommand.mock.calls[0][0].allowed_hosts).toEqual([
      spaceRule,
      'other.example.com',
      'search.example.com',
    ]);
    expect(results).toEqual([
      {
        type: ToolResultType.other,
        data: {
          stdout: '[REDACTED] [REDACTED]',
          stderr: '[REDACTED] [REDACTED]',
          exit_code: 0,
        },
      },
    ]);
  });

  it('deduplicates exact ids and normalizes every namespace', async () => {
    const { run, runCommand, request } = setup({ resolveConnectorCredentials: resolveCredentials });

    await run({
      connector_ids: ['--github..1--', '--github..1--', 'search-1', 'search-1'],
    });

    expect(resolveCredentials).toHaveBeenCalledTimes(2);
    expect(resolveCredentials).toHaveBeenCalledWith(
      '--github..1--',
      expect.objectContaining({ request, allowedConnectorIds: ['connector-1'] })
    );
    expect(resolveCredentials).toHaveBeenCalledWith('search-1', expect.anything());
    const { env } = runCommand.mock.calls[0][0];
    expect(env.CONNECTOR_GITHUB_1_ID).toBe('--github..1--');
    expect(env.CONNECTOR_SEARCH_1_ID).toBe('search-1');
    expect(env).not.toHaveProperty('CONNECTOR_ID');
  });

  it.each([{ errorMessage: 'Execute access denied' }, new Error('Credential lookup failed')])(
    'fails the entire call and names the second connector when resolution fails: %j',
    async (failure) => {
      const { run, runCommand } = setup({ resolveConnectorCredentials: resolveCredentials });
      resolveCredentials.mockImplementationOnce(async () =>
        buildConnectorEnv({
          connectorId: 'github-1',
          actionTypeId: '.github',
          config: {},
          headers: {},
          hosts: ['api.github.com'],
        })
      );
      if (failure instanceof Error) {
        resolveCredentials.mockRejectedValueOnce(failure);
      } else {
        resolveCredentials.mockResolvedValueOnce(failure);
      }

      const { results } = await run({ connector_ids: ['github-1', 'search-1'] });

      expect(results).toEqual([
        {
          type: ToolResultType.error,
          data: { message: expect.stringMatching(/[Cc]onnector 'search-1'/) },
        },
      ]);
      expect(runCommand).not.toHaveBeenCalled();
    }
  );

  it.each([
    {
      params: { connector_ids: ['github-1', 'github_1'] },
      message: 'normalized environment namespace',
    },
    { params: { connector_ids: ['---'] }, message: 'empty normalized environment namespace' },
  ])(
    'rejects invalid selection before resolving credentials: $params',
    async ({ params, message }) => {
      const { run, runCommand } = setup({ resolveConnectorCredentials: resolveCredentials });

      const { results } = await run(params);

      expect(results).toEqual([
        { type: ToolResultType.error, data: { message: expect.stringContaining(message) } },
      ]);
      expect(resolveCredentials).not.toHaveBeenCalled();
      expect(runCommand).not.toHaveBeenCalled();
    }
  );

  it('caps array input at 5 entries and permits a command with 5 unique ids', async () => {
    const { tool, run, runCommand } = setup({ resolveConnectorCredentials: resolveCredentials });
    const connectorIds = ['one', 'two', 'three', 'four', 'five'];

    expect(tool.schema.safeParse({ command: 'true', connector_ids: connectorIds }).success).toBe(
      true
    );
    expect(
      tool.schema.safeParse({ command: 'true', connector_ids: [...connectorIds, 'six'] }).success
    ).toBe(false);
    await run({ connector_ids: connectorIds });

    expect(resolveCredentials).toHaveBeenCalledTimes(5);
    expect(runCommand).toHaveBeenCalledTimes(1);
  });

  it('rejects final key collisions between distinct namespaces instead of overwriting credentials', async () => {
    const { run, runCommand } = setup({ resolveConnectorCredentials: resolveCredentials });
    resolveCredentials.mockImplementation(async (connectorId) =>
      buildConnectorEnv({
        connectorId,
        actionTypeId: '.http',
        config: connectorId === 'a' ? { header_authorization: 'config-value' } : {},
        headers: connectorId === 'a' ? {} : { Authorization: SEARCH_TOKEN },
        hosts: ['example.com'],
      })
    );

    const { results } = await run({ connector_ids: ['a', 'a_config'] });

    expect(results).toEqual([
      {
        type: ToolResultType.error,
        data: {
          message: expect.stringContaining(
            "colliding environment key 'CONNECTOR_A_CONFIG_HEADER_AUTHORIZATION'"
          ),
        },
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
      env: { CONNECTOR_CONNECTOR_1_HEADER_AUTHORIZATION: GITHUB_TOKEN },
      secretValues: [GITHUB_TOKEN],
      secretEnvKeys: [],
      allowedHosts: [],
    });
    const { run, writeFiles } = setup({ stdout, resolveConnectorCredentials });

    const { results } = await run({ connector_ids: ['connector-1'] });

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
