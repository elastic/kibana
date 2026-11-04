/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SandboxPluginStart } from '@kbn/sandbox-plugin/server';

export const SANDBOX_DISABLED_MESSAGE =
  'The sandbox is not available because Nightshift is not enabled in this deployment.';

/**
 * Wraps the sandbox start contract so no session can be obtained while the `nightshift.enabled`
 * feature flag is off.
 *
 * Agent Builder tools are gated per request by their availability handler, but workflow steps have
 * no such gate: a user who can author a workflow could otherwise reference the sandbox steps
 * directly and reach the sandbox service with the flag off. Every consumer in this plugin resolves
 * the sandbox through this wrapper, so the flag is enforced on the single path that mints sessions.
 */
export const createGatedSandboxStart = ({
  getSandboxStart,
  isNightshiftEnabled,
}: {
  getSandboxStart: () => SandboxPluginStart | undefined;
  /** Synchronous read of the `nightshift.enabled` flag; fails closed before start services resolve. */
  isNightshiftEnabled: () => boolean;
}): (() => SandboxPluginStart | undefined) => {
  const throwDisabled = (): never => {
    throw new Error(SANDBOX_DISABLED_MESSAGE);
  };

  return () => {
    const sandboxStart = getSandboxStart();
    if (!sandboxStart) {
      return undefined;
    }
    if (isNightshiftEnabled()) {
      return sandboxStart;
    }
    // Returning a throwing contract rather than `undefined` keeps the "not configured" and
    // "not enabled" cases distinguishable in step and tool error messages.
    return { getSession: throwDisabled, getSessionForSpace: throwDisabled };
  };
};
