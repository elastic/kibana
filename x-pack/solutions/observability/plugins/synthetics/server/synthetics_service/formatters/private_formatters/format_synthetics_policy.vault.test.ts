/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { scopeVaultConnections } from './format_synthetics_policy';
import type { HeartbeatVaultConfig } from '../../get_vault_connection';

const conn = (name: string): HeartbeatVaultConfig => ({
  enabled: true,
  name,
  type: 'hashicorp_vault',
  address: `http://${name}:8200`,
  auth_method: 'token',
  token: `${name}-token`,
});

describe('scopeVaultConnections', () => {
  const conns = [conn('prod'), conn('staging')];

  it('returns only the referenced named connections (never the others)', () => {
    const scoped = scopeVaultConnections(conns, new Set(['staging']));
    expect(scoped.map((c) => c.name)).toEqual(['staging']);
    // prod's secret must not be shipped to a monitor that only uses staging.
    expect(scoped.some((c) => c.name === 'prod')).toBe(false);
  });

  it('treats a single connection as the default for an unqualified reference', () => {
    expect(scopeVaultConnections([conn('only')], new Set([undefined])).map((c) => c.name)).toEqual([
      'only',
    ]);
  });

  it('does not over-ship a default reference when multiple connections exist', () => {
    // No default is well-defined with several connections — ship nothing rather
    // than every credential.
    expect(scopeVaultConnections(conns, new Set([undefined]))).toEqual([]);
  });

  it('fails closed on a reference to a connection that is not configured', () => {
    expect(() => scopeVaultConnections(conns, new Set(['nope']), 'm1')).toThrow(
      /references Vault connection "nope", which is not configured/
    );
  });

  it('dedupes a connection referenced more than once', () => {
    expect(scopeVaultConnections(conns, new Set(['prod']))).toHaveLength(1);
  });
});
