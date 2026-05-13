/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggingSystemMock } from '@kbn/core/server/mocks';
import {
  EmulationAllowlist,
  createDefaultAllowlistConfig,
  createTestAllowlistConfig,
  createRestrictiveAllowlistConfig,
  createAllowlistFromConfig,
} from './allowlist';

const makeLogger = () => loggingSystemMock.createLogger();

describe('EmulationAllowlist — defaults are safe (PROD-1)', () => {
  describe('createDefaultAllowlistConfig — default-deny', () => {
    // The default is now `allowAll: false` with an empty allowedHosts
    // set. A misconfigured deployment (no operator allowlist + an LLM
    // tool registered) MUST NOT be able to dispatch live response
    // actions to any endpoint. Regressing this default to `allowAll:
    // true` would turn every detection-emulation surface into an
    // open-by-default fanout of arbitrary endpoint commands.
    it('blocks every endpoint when no operator config is supplied', () => {
      const allowlist = new EmulationAllowlist(createDefaultAllowlistConfig(), makeLogger());

      const result = allowlist.validate(['agent-1', 'agent-2', 'agent-3']);

      expect(result.allowed).toBe(false);
      expect(result.blockedEndpoints).toEqual(['agent-1', 'agent-2', 'agent-3']);
      expect(result.error).toContain('not in allowlist');
    });

    it('blocks even a single endpoint with the default config', () => {
      const allowlist = new EmulationAllowlist(createDefaultAllowlistConfig(), makeLogger());

      const result = allowlist.validate(['agent-1']);

      expect(result.allowed).toBe(false);
      expect(result.blockedEndpoints).toEqual(['agent-1']);
    });
  });

  describe('createTestAllowlistConfig — permissive (TEST FIXTURES ONLY)', () => {
    // The permissive shape is preserved as a clearly-named opt-in for
    // tests focused on a downstream gate (rate limiter, idempotency
    // cache, runner) so they don't have to enumerate every endpoint
    // they happen to use. The name is the safety guard: a reviewer
    // seeing `createTestAllowlistConfig` in a non-test file knows it's
    // wrong on sight.
    it('permits any endpoint', () => {
      const allowlist = new EmulationAllowlist(createTestAllowlistConfig(), makeLogger());

      const result = allowlist.validate(['anything', 'goes', 'here']);

      expect(result.allowed).toBe(true);
      expect(result.blockedEndpoints).toEqual([]);
    });
  });

  describe('createRestrictiveAllowlistConfig — explicit allow list', () => {
    it('permits endpoints on the list and blocks the rest, naming each blocked endpoint', () => {
      const allowlist = new EmulationAllowlist(
        createRestrictiveAllowlistConfig(['agent-1', 'agent-2']),
        makeLogger()
      );

      expect(allowlist.validate(['agent-1']).allowed).toBe(true);
      expect(allowlist.validate(['agent-1', 'agent-2']).allowed).toBe(true);

      const blocked = allowlist.validate(['agent-1', 'agent-3']);
      expect(blocked.allowed).toBe(false);
      // Only the unlisted endpoint is named — operators see exactly
      // which endpoints to remediate without sifting through false
      // positives.
      expect(blocked.blockedEndpoints).toEqual(['agent-3']);
    });
  });
});

describe('createAllowlistFromConfig — operator-config translation', () => {
  // This helper is the single place the routes and the five tools turn
  // operator-supplied config into a runtime `EmulationAllowlistConfig`.
  // Drift between the routes' inline ternary and the tools' construction
  // would mean some surfaces default-allow while others default-deny —
  // which is exactly the silent inconsistency PROD-1 is here to remove.
  it('returns default-deny when the operator omits the allowlist config entirely', () => {
    const config = createAllowlistFromConfig(undefined);

    expect(config.allowAll).toBe(false);
    expect(config.allowedHosts.size).toBe(0);
  });

  it('honours `allowAll: true` from the operator config', () => {
    const config = createAllowlistFromConfig({ allowAll: true, endpointIds: [] });

    expect(config.allowAll).toBe(true);
  });

  it('translates `allowAll: false` + `endpointIds` into the restrictive shape', () => {
    const config = createAllowlistFromConfig({
      allowAll: false,
      endpointIds: ['agent-1', 'agent-2'],
    });

    expect(config.allowAll).toBe(false);
    expect([...config.allowedHosts]).toEqual(['agent-1', 'agent-2']);
  });

  it('honours `allowAll: false` + empty `endpointIds` as deny-everything (operator opt-in to a hard lockdown)', () => {
    const config = createAllowlistFromConfig({ allowAll: false, endpointIds: [] });

    expect(config.allowAll).toBe(false);
    expect(config.allowedHosts.size).toBe(0);
  });
});
