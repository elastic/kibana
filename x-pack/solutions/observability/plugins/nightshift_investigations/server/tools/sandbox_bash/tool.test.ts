/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggerMock } from '@kbn/logging-mocks';
import { agentBuilderMocks } from '@kbn/agent-builder-plugin/server/mocks';
import type { SandboxPluginStart, SandboxSession } from '@kbn/sandbox-plugin/server';
import { createSandboxBashTool, DEFAULT_SANDBOX_COMMAND_TIMEOUT_SECONDS } from './tool';
import type { ResolveConnectorCredentials } from './connector_credentials';
import type { SandboxWorkspaceManager } from './sandbox_workspace_manager';

const CONNECTOR_ID = 'github-1';
const FRAMEWORK_ENV = {
  CONNECTOR_ID,
  CONNECTOR_TYPE: '.github',
  CONNECTOR_HEADER_AUTHORIZATION: 'Bearer oauth-access-token',
  CONNECTOR_EXPIRES_AT: '2026-01-01T00:10:00.000Z',
  CONNECTOR_EXPIRES_IN_SECONDS: '600',
};

describe('sandbox bash tool', () => {
  const resolveConnectorCredentials = jest.fn<
    ReturnType<ResolveConnectorCredentials>,
    Parameters<ResolveConnectorCredentials>
  >();
  const runCommand = jest.fn();
  const getSession = jest.fn();
  const getSandboxStart = jest.fn();
  const ensureWorkspaceReady = jest.fn();

  const createTool = () =>
    createSandboxBashTool({
      getSandboxStart: getSandboxStart as () => SandboxPluginStart | undefined,
      sandboxWorkspaceManager: { ensureWorkspaceReady } as unknown as SandboxWorkspaceManager,
      resolveConnectorCredentials,
      logger: loggerMock.create(),
    });

  const createContext = () => {
    const context = agentBuilderMocks.tools.createHandlerContext();
    context.runContext.stack = [{ type: 'agent', agentId: 'agent-1', conversationId: 'conv-1' }];
    context.agentConfiguration = { connector_ids: [CONNECTOR_ID], tools: [] };
    return context;
  };

  beforeEach(() => {
    jest.clearAllMocks();
    runCommand.mockResolvedValue({ exit_code: 0, timed_out: false, stdout: 'ok', stderr: '' });
    getSession.mockReturnValue({ runCommand } as unknown as SandboxSession);
    getSandboxStart.mockReturnValue({ getSession });
    ensureWorkspaceReady.mockResolvedValue(undefined);
    resolveConnectorCredentials.mockResolvedValue({
      env: FRAMEWORK_ENV,
      secretValues: [FRAMEWORK_ENV.CONNECTOR_HEADER_AUTHORIZATION],
    });
  });

  it('forwards an explicit command timeout as the minimum token validity', async () => {
    const result = await createTool().handler(
      { command: 'echo hi', connector_id: CONNECTOR_ID, timeout_seconds: 120 },
      createContext()
    );

    expect(resolveConnectorCredentials).toHaveBeenCalledWith(
      CONNECTOR_ID,
      expect.objectContaining({ allowedConnectorIds: [CONNECTOR_ID] }),
      { minimumValiditySeconds: 120 }
    );
    expect(result).toEqual({
      results: [{ type: 'other', data: { stdout: 'ok', stderr: '', exit_code: 0 } }],
    });
  });

  it('uses the default command timeout as minimum token validity when omitted', async () => {
    await createTool().handler({ command: 'echo hi', connector_id: CONNECTOR_ID }, createContext());

    expect(resolveConnectorCredentials).toHaveBeenCalledWith(
      CONNECTOR_ID,
      expect.objectContaining({ allowedConnectorIds: [CONNECTOR_ID] }),
      { minimumValiditySeconds: DEFAULT_SANDBOX_COMMAND_TIMEOUT_SECONDS }
    );
  });

  it('injects only framework-resolved credential env into the sandbox command', async () => {
    await createTool().handler(
      {
        command: 'echo hi',
        connector_id: CONNECTOR_ID,
        env: {
          AGENT_SUPPLIED: 'visible',
          CONNECTOR_HEADER_AUTHORIZATION: 'Bearer should-not-win',
          CONNECTOR_SECRET_TOKEN: 'raw-storage-secret',
        },
      },
      createContext()
    );

    expect(runCommand).toHaveBeenCalledWith(
      expect.objectContaining({
        command: 'echo hi',
        env: expect.objectContaining({
          ...FRAMEWORK_ENV,
          AGENT_SUPPLIED: 'visible',
        }),
      })
    );
    const env = runCommand.mock.calls[0][0].env as Record<string, string>;
    expect(env.CONNECTOR_HEADER_AUTHORIZATION).toBe(FRAMEWORK_ENV.CONNECTOR_HEADER_AUTHORIZATION);
    expect(env.CONNECTOR_SECRET_CLIENTSECRET).toBeUndefined();
    expect(JSON.stringify(env)).not.toContain('oauth-client-secret');
    expect(JSON.stringify(env)).not.toContain('refresh_token');
  });
});
