/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as t from 'io-ts';

export const VaultAuthMethodCodec = t.union([t.literal('token'), t.literal('approle')]);
export type VaultAuthMethod = t.TypeOf<typeof VaultAuthMethodCodec>;

/**
 * The HashiCorp Vault connection Synthetics uses to resolve vault-backed params.
 * Stored as a single, space-scoped encrypted saved object; the `token`/`secretId`
 * secrets are encrypted at rest. This connection is propagated to Heartbeat via
 * the Fleet agent policy so the agent can resolve ${vault/...} references at the
 * edge.
 */
export const SyntheticsVaultConnectionCodec = t.intersection([
  t.type({
    address: t.string,
    authMethod: VaultAuthMethodCodec,
  }),
  t.partial({
    namespace: t.string,
    kvMount: t.string,
    tlsSkipVerify: t.boolean,
    // token auth
    token: t.string,
    // approle auth
    roleId: t.string,
    secretId: t.string,
  }),
]);

export type SyntheticsVaultConnection = t.TypeOf<typeof SyntheticsVaultConnectionCodec>;

/**
 * The safe, secret-free view of the connection returned to the browser.
 */
export const VaultConnectionStatusCodec = t.intersection([
  t.type({ configured: t.boolean }),
  t.partial({
    address: t.string,
    namespace: t.string,
    authMethod: VaultAuthMethodCodec,
    roleId: t.string,
    kvMount: t.string,
    tlsSkipVerify: t.boolean,
    // whether an encrypted secret (token/secret_id) is stored, so the UI can show
    // "•••• saved" without ever receiving the value.
    hasSecret: t.boolean,
  }),
]);

export type VaultConnectionStatus = t.TypeOf<typeof VaultConnectionStatusCodec>;
