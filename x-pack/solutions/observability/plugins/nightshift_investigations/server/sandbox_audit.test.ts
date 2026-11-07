/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggerMock } from '@kbn/logging-mocks';
import type { KibanaRequest } from '@kbn/core/server';
import type { AuditLogger, CoreAuditService } from '@kbn/core-security-server';
import type { SandboxRpcInfo, SandboxSession } from '@kbn/sandbox-plugin/server';
import { SandboxRpcError } from '@kbn/sandbox-plugin/server';
import { auditedSandboxSession, createAuditedSandboxStart } from './sandbox_audit';
import type { SandboxCaller } from './sandbox_audit';

const rpc = (overrides: Partial<SandboxRpcInfo> = {}): SandboxRpcInfo => ({
  requestId: 'proxy-req-1',
  conversationId: 'default__conv-1',
  method: 'sandbox.SandboxService/StatFiles',
  statusCode: 'OK',
  durationNs: 12_345,
  ...overrides,
});

const toolCaller: SandboxCaller = {
  type: 'tool',
  toolId: 'nightshift_sandbox_bash',
  toolCallId: 'call-1',
};

const stepCaller: SandboxCaller = {
  type: 'workflow_step',
  stepType: 'nightshift.obtainSandbox',
  stepId: 'obtain',
  workflowExecutionId: 'exec-1',
};

const createAudit = (enabled = true) =>
  ({ log: jest.fn(), enabled, includeSavedObjectNames: false } as jest.Mocked<AuditLogger>);

const createSession = () =>
  ({
    isReset: true,
    runCommand: jest.fn(),
    readFiles: jest.fn(),
    writeFiles: jest.fn(),
    mkdirs: jest.fn(),
    statFiles: jest.fn(),
  } as unknown as jest.Mocked<SandboxSession>);

describe('auditedSandboxSession', () => {
  let session: jest.Mocked<SandboxSession>;
  let audit: jest.Mocked<AuditLogger>;
  const logger = loggerMock.create();

  const audited = (caller: SandboxCaller = toolCaller, spaceId?: string) =>
    auditedSandboxSession({ session, audit, caller, spaceId, logger });
  const logged = () => audit.log.mock.calls[0][0] as unknown as Record<string, any>;

  beforeEach(() => {
    jest.clearAllMocks();
    session = createSession();
    audit = createAudit();
  });

  it('resolves with the plain value and writes one event for the call', async () => {
    session.statFiles.mockResolvedValue({ value: [{ path: '/a' }] as any, rpc: rpc() });

    await expect(audited().statFiles(['/a'])).resolves.toEqual([{ path: '/a' }]);

    expect(audit.log).toHaveBeenCalledTimes(1);
    expect(logged()).toEqual({
      message: 'Sandbox RPC sandbox.SandboxService/StatFiles finished with gRPC status OK',
      event: {
        action: 'sandbox_rpc',
        category: ['file'],
        type: ['access'],
        outcome: 'success',
        duration: 12_345,
      },
      kibana: {
        sandbox_caller: {
          plugin_id: 'nightshiftInvestigations',
          type: 'tool',
          id: 'nightshift_sandbox_bash',
          execution_id: 'call-1',
        },
      },
      sandbox: { conversation_id: 'default__conv-1', proxy_request_id: 'proxy-req-1' },
      rpc: {
        method: 'sandbox.SandboxService/StatFiles',
        status_code: 'OK',
      },
    });
  });

  it('keeps the proxy request id out of http.request.id, which Serverless overwrites', async () => {
    session.statFiles.mockResolvedValue({ value: [], rpc: rpc() });

    await audited().statFiles(['/a']);

    expect(logged()).not.toHaveProperty('http');
    expect(logged().sandbox.proxy_request_id).toBe('proxy-req-1');
  });

  it('omits the proxy request id when the response carried none', async () => {
    session.statFiles.mockResolvedValue({ value: [], rpc: rpc({ requestId: undefined }) });

    await audited().statFiles(['/a']);

    expect(logged().sandbox).toEqual({ conversation_id: 'default__conv-1' });
  });

  it('writes an event for a failed call and rethrows the error unchanged', async () => {
    const failure = new SandboxRpcError(
      rpc({ method: 'sandbox.SandboxService/RunCommand', statusCode: 'UNAVAILABLE' }),
      Object.assign(new Error('14 UNAVAILABLE'), { code: 14 })
    );
    session.runCommand.mockRejectedValue(failure);

    await expect(audited().runCommand({ command: 'true' })).rejects.toBe(failure);

    expect(audit.log).toHaveBeenCalledTimes(1);
    expect(logged().event).toMatchObject({ outcome: 'failure', category: ['process'] });
    expect(logged().rpc.status_code).toBe('UNAVAILABLE');
  });

  it('writes no event for an error raised before any RPC', async () => {
    session.statFiles.mockRejectedValue(new Error('Sandbox is not configured'));

    await expect(audited().statFiles(['/a'])).rejects.toThrow('not configured');

    expect(audit.log).not.toHaveBeenCalled();
  });

  it.each([
    ['runCommand', 'RunCommand', 'process', (s: any) => s.runCommand({ command: 'true' })],
    ['readFiles', 'ReadFiles', 'file', (s: any) => s.readFiles([{ path: '/a' }])],
    [
      'writeFiles',
      'WriteFiles',
      'file',
      (s: any) => s.writeFiles([{ path: '/a', content: Buffer.from('') }]),
    ],
    ['mkdirs', 'Mkdirs', 'file', (s: any) => s.mkdirs(['/a'])],
    ['statFiles', 'StatFiles', 'file', (s: any) => s.statFiles(['/a'])],
  ])('audits %s as a %s call in the %s category', async (property, rpcName, expected, call) => {
    (session as any)[property].mockResolvedValue({
      value: [],
      rpc: rpc({ method: `sandbox.SandboxService/${rpcName}` }),
    });

    await call(audited());

    expect(logged().event.category).toEqual([expected]);
    expect(logged().rpc.method).toBe(`sandbox.SandboxService/${rpcName}`);
  });

  it('describes a workflow step by its type, its run and its id', async () => {
    session.statFiles.mockResolvedValue({ value: [], rpc: rpc() });

    await audited(stepCaller, 'my-space').statFiles(['/workspace']);

    expect(logged().kibana).toEqual({
      space_id: 'my-space',
      sandbox_caller: {
        plugin_id: 'nightshiftInvestigations',
        type: 'workflow_step',
        id: 'nightshift.obtainSandbox',
        execution_id: 'exec-1',
      },
    });
    expect(logged().labels).toEqual({ step_id: 'obtain' });
  });

  it('describes the findings recorder', async () => {
    session.statFiles.mockResolvedValue({ value: [], rpc: rpc() });

    await audited({ type: 'findings_recorder' }).statFiles(['/a']);

    expect(logged().kibana.sandbox_caller).toEqual({
      plugin_id: 'nightshiftInvestigations',
      type: 'findings_recorder',
      id: 'final_pass',
    });
  });

  it('records no command text, env value, file path or file content', async () => {
    session.runCommand.mockResolvedValue({
      value: { stdout: 'secret-output', stderr: '', exit_code: 0, timed_out: false },
      rpc: rpc({ method: 'sandbox.SandboxService/RunCommand' }),
    });

    await audited().runCommand({
      command: 'curl https://x/secret-command',
      env: { TOKEN: 'secret-env-value' },
      directory: '/secret/dir',
    });

    const text = JSON.stringify(logged());
    for (const leaked of ['secret-command', 'secret-env-value', '/secret/dir', 'secret-output']) {
      expect(text).not.toContain(leaked);
    }
  });

  it('writes nothing when audit logging is disabled', async () => {
    audit = createAudit(false);
    session.statFiles.mockResolvedValue({ value: [], rpc: rpc() });

    await audited().statFiles(['/a']);

    expect(audit.log).not.toHaveBeenCalled();
  });

  it('does not fail the call when the audit event cannot be written, and says so', async () => {
    audit.log.mockImplementation(() => {
      throw new Error('appender down');
    });
    session.statFiles.mockResolvedValue({ value: [{ path: '/a' }] as any, rpc: rpc() });

    await expect(audited().statFiles(['/a'])).resolves.toEqual([{ path: '/a' }]);

    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('appender down'));
  });

  it('does not fail the call when the audit logger rejects, and says so', async () => {
    audit.log.mockReturnValue(Promise.reject(new Error('session store down')) as unknown as void);
    session.statFiles.mockResolvedValue({ value: [{ path: '/a' }] as any, rpc: rpc() });

    await expect(audited().statFiles(['/a'])).resolves.toEqual([{ path: '/a' }]);
    await new Promise((resolve) => setImmediate(resolve));

    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('session store down'));
  });

  it('writes no event and no warning when the audit logger is not enabled', async () => {
    audit = createAudit(false);
    session.statFiles.mockResolvedValue({ value: [], rpc: rpc() });

    await audited().statFiles(['/a']);

    expect(audit.log).not.toHaveBeenCalled();
    expect(logger.warn).not.toHaveBeenCalled();
  });

  it('exposes the pod session as a stable key and its reset state live', () => {
    const first = audited();
    const second = audited(stepCaller);

    expect(first.sessionKey).toBe(session);
    expect(second.sessionKey).toBe(first.sessionKey);
    expect(first.isReset).toBe(true);
    (session as any).isReset = false;
    expect(first.isReset).toBe(false);
  });
});

describe('createAuditedSandboxStart', () => {
  const request = { id: 'req' } as unknown as KibanaRequest;
  const logger = loggerMock.create();

  const setup = () => {
    const session = createSession();
    const scoped = createAudit();
    const unscoped = createAudit();
    const audit = {
      asScoped: jest.fn().mockReturnValue(scoped),
      withoutRequest: unscoped,
    } as unknown as jest.Mocked<CoreAuditService>;
    const sandboxStart = {
      getSession: jest.fn().mockReturnValue(session),
      getSessionForSpace: jest.fn().mockReturnValue(session),
    };
    const start = createAuditedSandboxStart({ sandboxStart, audit, logger });
    return { session, scoped, unscoped, audit, sandboxStart, start };
  };

  it('audits a request-scoped session with the request, which names the user or service account', async () => {
    const { session, scoped, unscoped, audit, sandboxStart, start } = setup();
    session.statFiles.mockResolvedValue({ value: [], rpc: rpc() });

    await start.getSession(request, 'conv-1', toolCaller).statFiles(['/a']);

    expect(sandboxStart.getSession).toHaveBeenCalledWith(request, 'conv-1');
    expect(audit.asScoped).toHaveBeenCalledWith(request);
    expect(scoped.log).toHaveBeenCalledTimes(1);
    expect(unscoped.log).not.toHaveBeenCalled();
  });

  it('audits a workflow step with its fake request, which names a service account', async () => {
    const { session, scoped, unscoped, audit, start } = setup();
    session.statFiles.mockResolvedValue({ value: [], rpc: rpc() });
    const fakeRequest = { isFakeRequest: true } as unknown as KibanaRequest;

    await start
      .getSessionForSpace('my-space', 'conv-1', { ...stepCaller, request: fakeRequest })
      .statFiles(['/a']);

    expect(audit.asScoped).toHaveBeenCalledWith(fakeRequest);
    expect(scoped.log).toHaveBeenCalledTimes(1);
    // The space is named by the event, so it does not depend on the request's base path.
    expect((scoped.log.mock.calls[0][0] as any).kibana.space_id).toBe('my-space');
    // Nothing of the request itself reaches the event.
    expect(JSON.stringify(scoped.log.mock.calls[0][0])).not.toContain('isFakeRequest');
    expect(unscoped.log).not.toHaveBeenCalled();
  });

  it('audits a space session without a request and names the space', async () => {
    const { session, scoped, unscoped, sandboxStart, start } = setup();
    session.statFiles.mockResolvedValue({ value: [], rpc: rpc() });

    await start.getSessionForSpace('my-space', 'conv-1', stepCaller).statFiles(['/a']);

    expect(sandboxStart.getSessionForSpace).toHaveBeenCalledWith('my-space', 'conv-1');
    expect(unscoped.log).toHaveBeenCalledTimes(1);
    expect((unscoped.log.mock.calls[0][0] as any).kibana.space_id).toBe('my-space');
    expect(scoped.log).not.toHaveBeenCalled();
  });
});
