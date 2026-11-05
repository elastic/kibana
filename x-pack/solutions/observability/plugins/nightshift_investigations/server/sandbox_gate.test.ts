/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggerMock } from '@kbn/logging-mocks';
import type { KibanaRequest } from '@kbn/core/server';
import type { CoreAuditService } from '@kbn/core-security-server';
import type { SandboxPluginStart } from '@kbn/sandbox-plugin/server';
import type { SandboxWorkload } from './sandbox_audit';
import {
  SANDBOX_AUDIT_UNAVAILABLE_MESSAGE,
  SANDBOX_DISABLED_MESSAGE,
  createGatedSandboxStart,
} from './sandbox_gate';

const sandboxStart = {
  getSession: jest.fn(),
  getSessionForSpace: jest.fn(),
} as unknown as jest.Mocked<SandboxPluginStart>;

const audit = {
  asScoped: jest.fn(),
  withoutRequest: { log: jest.fn(), enabled: true },
} as unknown as CoreAuditService;

const request = {} as KibanaRequest;
const workload: SandboxWorkload = { type: 'tool', toolId: 'tool', toolCallId: 'call' };
const logger = loggerMock.create();

describe('createGatedSandboxStart', () => {
  beforeEach(() => jest.clearAllMocks());

  it('hands out audited sessions when Nightshift is enabled', () => {
    sandboxStart.getSession.mockReturnValue({ isReset: true } as any);
    const getSandboxStart = createGatedSandboxStart({
      getSandboxStart: () => sandboxStart,
      getAudit: () => audit,
      isNightshiftEnabled: () => true,
      logger,
    });

    const session = getSandboxStart()!.getSession(request, 'conversation-1', workload);

    expect(sandboxStart.getSession).toHaveBeenCalledWith(request, 'conversation-1');
    expect(session.isReset).toBe(true);
    expect(audit.asScoped).toHaveBeenCalledWith(request);
  });

  it('throws on every session accessor when Nightshift is disabled', () => {
    const getSandboxStart = createGatedSandboxStart({
      getSandboxStart: () => sandboxStart,
      getAudit: () => audit,
      isNightshiftEnabled: () => false,
      logger,
    });

    const gated = getSandboxStart()!;
    expect(() => gated.getSession(request, 'conversation-1', workload)).toThrow(
      SANDBOX_DISABLED_MESSAGE
    );
    expect(() => gated.getSessionForSpace('default', 'conversation-1', workload)).toThrow(
      SANDBOX_DISABLED_MESSAGE
    );
    expect(sandboxStart.getSession).not.toHaveBeenCalled();
    expect(sandboxStart.getSessionForSpace).not.toHaveBeenCalled();
  });

  it('makes the sandbox unavailable, not unaudited, when there is no audit service', () => {
    const getSandboxStart = createGatedSandboxStart({
      getSandboxStart: () => sandboxStart,
      getAudit: () => undefined,
      isNightshiftEnabled: () => true,
      logger,
    });

    const gated = getSandboxStart()!;
    expect(() => gated.getSession(request, 'conversation-1', workload)).toThrow(
      SANDBOX_AUDIT_UNAVAILABLE_MESSAGE
    );
    expect(() => gated.getSessionForSpace('default', 'conversation-1', workload)).toThrow(
      SANDBOX_AUDIT_UNAVAILABLE_MESSAGE
    );
    expect(sandboxStart.getSession).not.toHaveBeenCalled();
  });

  it('returns undefined when the sandbox plugin is absent', () => {
    const getSandboxStart = createGatedSandboxStart({
      getSandboxStart: () => undefined,
      getAudit: () => audit,
      isNightshiftEnabled: () => true,
      logger,
    });

    expect(getSandboxStart()).toBeUndefined();
  });
});
