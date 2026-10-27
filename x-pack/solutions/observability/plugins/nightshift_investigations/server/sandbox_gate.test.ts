/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core/server';
import type { SandboxPluginStart } from '@kbn/sandbox-plugin/server';
import { SANDBOX_DISABLED_MESSAGE, createGatedSandboxStart } from './sandbox_gate';

const sandboxStart = {
  getSession: jest.fn(),
  getSessionForSpace: jest.fn(),
} as unknown as jest.Mocked<SandboxPluginStart>;

const request = {} as KibanaRequest;

describe('createGatedSandboxStart', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns the real contract when Nightshift is enabled', () => {
    const getSandboxStart = createGatedSandboxStart({
      getSandboxStart: () => sandboxStart,
      isNightshiftEnabled: () => true,
    });

    expect(getSandboxStart()).toBe(sandboxStart);
  });

  it('throws on every session accessor when Nightshift is disabled', () => {
    const getSandboxStart = createGatedSandboxStart({
      getSandboxStart: () => sandboxStart,
      isNightshiftEnabled: () => false,
    });

    const gated = getSandboxStart()!;
    expect(() => gated.getSession(request, 'conversation-1')).toThrow(SANDBOX_DISABLED_MESSAGE);
    expect(() => gated.getSessionForSpace('default', 'conversation-1')).toThrow(
      SANDBOX_DISABLED_MESSAGE
    );
    expect(sandboxStart.getSession).not.toHaveBeenCalled();
    expect(sandboxStart.getSessionForSpace).not.toHaveBeenCalled();
  });

  it('returns undefined when the sandbox plugin is absent', () => {
    const getSandboxStart = createGatedSandboxStart({
      getSandboxStart: () => undefined,
      isNightshiftEnabled: () => true,
    });

    expect(getSandboxStart()).toBeUndefined();
  });
});
