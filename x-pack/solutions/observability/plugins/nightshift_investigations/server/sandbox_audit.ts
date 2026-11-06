/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest, Logger } from '@kbn/core/server';
import type { AuditLogger, CoreAuditService } from '@kbn/core-security-server';
import type {
  FileMetadata,
  ReadFileResult,
  RunCommandParams,
  RunCommandResult,
  SandboxPluginStart,
  SandboxRpcInfo,
  SandboxRpcResult,
  SandboxSession,
  WriteFileResult,
} from '@kbn/sandbox-plugin/server';
import { SandboxRpcError } from '@kbn/sandbox-plugin/server';

const PLUGIN_ID = 'nightshiftInvestigations';

/**
 * What issued a sandbox RPC. It is the context only this plugin has, and it is what lets an
 * incident responder follow one RPC from a tool call or a workflow step to the sandbox.
 */
export type SandboxCaller =
  | {
      type: 'tool';
      /** The Agent Builder tool, for example `nightshift_sandbox_bash`. */
      toolId: string;
      /** This call of the tool. */
      toolCallId: string;
    }
  | {
      type: 'workflow_step';
      /** The step type, for example `nightshift.obtainSandbox`. */
      stepType: string;
      /** The step's id within its workflow. */
      stepId: string;
      /** This run of the workflow. */
      workflowExecutionId?: string;
    }
  | {
      /** The pass over an investigation's workspace that proposes its findings. */
      type: 'findings_recorder';
    };

/**
 * A sandbox session whose every RPC is audited. It has the methods of {@link SandboxSession} and
 * resolves with the plain value, so the code that uses a session does not handle the RPC
 * fields. The audit event is written here, where the session is obtained, and a session cannot
 * be obtained without saying what it is for.
 */
export interface AuditedSandboxSession {
  /**
   * Identifies the pod session behind this view. A view is made per tool call or step, so a cache
   * keyed by session needs this, not the view. It is opaque on purpose: it is not the session, so
   * it cannot be used to call the sandbox without an audit event.
   */
  readonly sessionKey: object;
  readonly isReset: boolean;
  runCommand(params: RunCommandParams): Promise<RunCommandResult>;
  readFiles(requests: Array<{ path: string; maxReadBytes?: number }>): Promise<ReadFileResult[]>;
  writeFiles(files: Array<{ path: string; content: Buffer }>): Promise<WriteFileResult[]>;
  mkdirs(paths: string[]): Promise<boolean[]>;
  statFiles(paths: string[]): Promise<FileMetadata[]>;
}

/** The sandbox start contract of this plugin: every session it hands out is audited. */
export interface NightshiftSandboxStart {
  getSession(
    request: KibanaRequest,
    sessionId: string,
    caller: SandboxCaller
  ): AuditedSandboxSession;
  getSessionForSpace(
    spaceId: string,
    sessionId: string,
    caller: SandboxCaller
  ): AuditedSandboxSession;
}

/** Process-level RPCs run commands; the others move files. */
const category = (method: string): 'process' | 'file' =>
  method.endsWith('/RunCommand') ? 'process' : 'file';

/**
 * The audit event of one RPC.
 *
 * The proxy's request id is `sandbox.proxy_request_id`, not `http.request.id`. On Serverless the
 * audit pipeline writes Kibana's own request id to `http.request.id` and would overwrite it.
 * sandbox-api logs it under the same name, so one search finds both sides of a call.
 */
const auditEvent = (rpc: SandboxRpcInfo, caller: SandboxCaller, spaceId?: string) => {
  const outcome: 'success' | 'failure' = rpc.statusCode === 'OK' ? 'success' : 'failure';
  return {
    message: `Sandbox RPC ${rpc.method} finished with gRPC status ${rpc.statusCode}`,
    event: {
      action: 'sandbox_rpc',
      category: [category(rpc.method)],
      type: ['access' as const],
      outcome,
      duration: rpc.durationNs,
    },
    kibana: {
      ...(spaceId ? { space_id: spaceId } : {}),
      sandbox_caller:
        caller.type === 'tool'
          ? {
              plugin_id: PLUGIN_ID,
              type: 'tool',
              id: caller.toolId,
              execution_id: caller.toolCallId,
            }
          : caller.type === 'workflow_step'
          ? {
              plugin_id: PLUGIN_ID,
              type: 'workflow_step',
              id: caller.stepType,
              ...(caller.workflowExecutionId ? { execution_id: caller.workflowExecutionId } : {}),
            }
          : { plugin_id: PLUGIN_ID, type: 'findings_recorder', id: 'final_pass' },
    },
    ...(caller.type === 'workflow_step' ? { labels: { step_id: caller.stepId } } : {}),
    sandbox: {
      conversation_id: rpc.conversationId,
      ...(rpc.requestId ? { proxy_request_id: rpc.requestId } : {}),
    },
    rpc: {
      method: rpc.method,
      status_code: rpc.statusCode,
    },
  };
};

/**
 * Wraps a sandbox session so every RPC writes one audit event, whether it succeeds or fails, and
 * resolves with the plain value. An RPC that fails without reaching sandbox-api, such as a refused
 * connection, still writes one: it has no request id but has the status.
 */
export const auditedSandboxSession = ({
  session,
  audit,
  caller,
  spaceId,
  logger,
}: {
  session: SandboxSession;
  audit: AuditLogger;
  caller: SandboxCaller;
  spaceId?: string;
  logger: Logger;
}): AuditedSandboxSession => {
  const record = (rpc: SandboxRpcInfo) => {
    if (!audit.enabled) return;
    // An audit failure must not fail the sandbox call, but it must not pass unnoticed either. The
    // request-scoped logger writes asynchronously, so its failure is a rejection, not a throw.
    const warn = (err: unknown) =>
      logger.warn(
        `Failed to write the audit event of a sandbox RPC: ${
          err instanceof Error ? err.message : String(err)
        }`
      );
    try {
      Promise.resolve(audit.log(auditEvent(rpc, caller, spaceId))).catch(warn);
    } catch (err) {
      warn(err);
    }
  };

  const audited = async <T>(call: () => Promise<SandboxRpcResult<T>>): Promise<T> => {
    try {
      const { value, rpc } = await call();
      record(rpc);
      return value;
    } catch (err) {
      if (err instanceof SandboxRpcError) record(err.rpc);
      throw err;
    }
  };

  return {
    sessionKey: session,
    get isReset() {
      return session.isReset;
    },
    runCommand: (params) => audited(() => session.runCommand(params)),
    readFiles: (requests) => audited(() => session.readFiles(requests)),
    writeFiles: (files) => audited(() => session.writeFiles(files)),
    mkdirs: (paths) => audited(() => session.mkdirs(paths)),
    statFiles: (paths) => audited(() => session.statFiles(paths)),
  };
};

/**
 * Adds auditing to the sandbox start contract. A request-scoped audit logger attaches the user, or
 * the service account that runs an investigation, to every event; a workflow step has no request,
 * so its events carry the space and the workflow instead.
 */
export const createAuditedSandboxStart = ({
  sandboxStart,
  audit,
  logger,
}: {
  sandboxStart: Pick<SandboxPluginStart, 'getSession' | 'getSessionForSpace'>;
  audit: CoreAuditService;
  logger: Logger;
}): NightshiftSandboxStart => ({
  getSession: (request, sessionId, caller) =>
    auditedSandboxSession({
      session: sandboxStart.getSession(request, sessionId),
      audit: audit.asScoped(request),
      caller,
      logger,
    }),
  getSessionForSpace: (spaceId, sessionId, caller) =>
    auditedSandboxSession({
      session: sandboxStart.getSessionForSpace(spaceId, sessionId),
      audit: audit.withoutRequest,
      caller,
      spaceId,
      logger,
    }),
});
