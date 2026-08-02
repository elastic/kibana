/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as t from 'io-ts';

/**
 * Secret-provider backend discriminator. Only HashiCorp Vault is implemented
 * today, but the connection model below is deliberately shaped so other providers
 * (CyberArk, Azure Key Vault, AWS Secrets Manager) are *additive*: to add one you
 * add a literal here, a `<provider>Config`/`<provider>Secrets` pair, a member to
 * `SecretProviderConnectionCodec`, and a resolver on the agent — with no change to
 * the reference-token grammar, the saved-object schema, or the encryption model.
 */
export const SecretProviderTypeCodec = t.keyof({
  hashicorp_vault: null,
  // cyberark: null,
  // azure_key_vault: null,
  // aws_secrets_manager: null,
});
export type SecretProviderType = t.TypeOf<typeof SecretProviderTypeCodec>;

export const SECRET_PROVIDER_HASHICORP_VAULT: SecretProviderType = 'hashicorp_vault';

export const VaultAuthMethodCodec = t.union([t.literal('token'), t.literal('approle')]);
export type VaultAuthMethod = t.TypeOf<typeof VaultAuthMethodCodec>;

/* ------------------------------------------------------------------ *
 * HashiCorp Vault provider
 * ------------------------------------------------------------------ */

/** Non-secret, provider-specific settings. Safe to return to the browser. */
export const HashiCorpVaultConfigCodec = t.intersection([
  t.type({
    address: t.string,
    authMethod: VaultAuthMethodCodec,
  }),
  t.partial({
    namespace: t.string,
    kvMount: t.string,
    tlsSkipVerify: t.boolean,
    // approle: the role id is not a secret (the secret_id is).
    roleId: t.string,
  }),
]);
export type HashiCorpVaultConfig = t.TypeOf<typeof HashiCorpVaultConfigCodec>;

/** Secret, provider-specific settings. Encrypted at rest as one blob. */
export const HashiCorpVaultSecretsCodec = t.partial({
  token: t.string,
  secretId: t.string,
});
export type HashiCorpVaultSecrets = t.TypeOf<typeof HashiCorpVaultSecretsCodec>;

const HashiCorpVaultConnectionCodec = t.intersection([
  t.type({
    // Unique connection name, addressed by params as ${vault/<name>@<path>#<field>}.
    name: t.string,
    type: t.literal('hashicorp_vault'),
    config: HashiCorpVaultConfigCodec,
  }),
  t.partial({
    // How long the agent caches a resolved secret before re-reading (e.g. "5m").
    // Common to every provider (it's the resolver cache window), so it lives at the
    // top level rather than in a provider `config`.
    secretRefreshInterval: t.string,
    // Bumped on save / manual refresh; part of the delivered blob so a change
    // forces agents to re-resolve (and thus pick up a rotated secret).
    refreshedAt: t.string,
    secrets: HashiCorpVaultSecretsCodec,
    // Non-secret marker: whether a provider secret is stored. Lets the (non-
    // decrypting) list read report "secret saved" without reading the secret.
    hasSecret: t.boolean,
  }),
]);

/**
 * A stored secret-provider connection. A discriminated union on `type`; today it
 * has a single member. When a second provider lands, change this to
 * `t.union([HashiCorpVaultConnectionCodec, CyberArkConnectionCodec, ...])`.
 *
 * Stored as a space-scoped encrypted saved object: the whole `secrets` blob is
 * encrypted at rest. The connection is propagated to Heartbeat via the Fleet agent
 * policy so the agent can resolve ${vault/...} references at the edge.
 */
export const SecretProviderConnectionCodec = HashiCorpVaultConnectionCodec;
export type SecretProviderConnection = t.TypeOf<typeof SecretProviderConnectionCodec>;

/** Back-compat alias for the stored connection type. */
export type SyntheticsVaultConnection = SecretProviderConnection;

/**
 * The safe, secret-free view of a connection returned to the browser: the
 * non-secret provider `config` verbatim, plus a `hasSecret` flag so the UI can
 * render "•••• saved" without ever receiving the value.
 */
export const VaultConnectionStatusCodec = t.intersection([
  t.type({ configured: t.boolean }),
  t.partial({
    name: t.string,
    type: SecretProviderTypeCodec,
    secretRefreshInterval: t.string,
    refreshedAt: t.string,
    // Non-secret provider config. A union of provider configs once there is more
    // than one; HashiCorp Vault's shape today.
    config: HashiCorpVaultConfigCodec,
    hasSecret: t.boolean,
  }),
]);

export type VaultConnectionStatus = t.TypeOf<typeof VaultConnectionStatusCodec>;

export const VaultConnectionStatusListCodec = t.array(VaultConnectionStatusCodec);
