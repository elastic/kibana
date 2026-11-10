/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import type { CoreAuditService } from '@kbn/core-security-server';
import type { SandboxPluginStart } from '@kbn/sandbox-plugin/server';
import type { NightshiftSandboxStart } from './sandbox_audit';
import { createAuditedSandboxStart } from './sandbox_audit';

export const SANDBOX_DISABLED_MESSAGE =
  'The sandbox is not available because Nightshift is not enabled in this deployment.';

export const SANDBOX_AUDIT_UNAVAILABLE_MESSAGE =
  'The sandbox is not available because its calls cannot be audited: the audit service is not available.';

/**
 * Wraps the sandbox start contract so no session can be obtained while the `nightshift.enabled`
 * feature flag is off, and so every session it hands out is audited.
 *
 * Agent Builder tools are gated per request by their availability handler, but workflow steps have
 * no such gate: a user who can author a workflow could otherwise reference the sandbox steps
 * directly and reach the sandbox service with the flag off. Every consumer in this plugin resolves
 * the sandbox through this wrapper, so the flag is enforced on the single path that mints sessions.
 * The same path writes the audit event of every RPC, and a missing audit service makes the sandbox
 * unavailable, not unaudited. Audit logging itself can be switched off by configuration
 * (`xpack.security.audit.enabled`, off by default): then the audit service exists, no event is
 * written and nothing says so.
 */
export const createGatedSandboxStart = ({
  getSandboxStart,
  getAudit,
  isNightshiftEnabled,
  logger,
}: {
  getSandboxStart: () => SandboxPluginStart | undefined;
  getAudit: () => CoreAuditService | undefined;
  /** Synchronous read of the `nightshift.enabled` flag; fails closed before start services resolve. */
  isNightshiftEnabled: () => boolean;
  logger: Logger;
}): (() => NightshiftSandboxStart | undefined) => {
  const throwUnavailable = (message: string) => {
    const throwing = (): never => {
      throw new Error(message);
    };
    return { getSession: throwing, getSessionForSpace: throwing };
  };

  return () => {
    const sandboxStart = getSandboxStart();
    if (!sandboxStart) {
      return undefined;
    }
    // Returning a throwing contract rather than `undefined` keeps the "not configured", "not
    // enabled" and "not auditable" cases distinguishable in step and tool error messages.
    if (!isNightshiftEnabled()) {
      return throwUnavailable(SANDBOX_DISABLED_MESSAGE);
    }
    const audit = getAudit();
    if (!audit) {
      return throwUnavailable(SANDBOX_AUDIT_UNAVAILABLE_MESSAGE);
    }
    return createAuditedSandboxStart({ sandboxStart, audit, logger });
  };
};
