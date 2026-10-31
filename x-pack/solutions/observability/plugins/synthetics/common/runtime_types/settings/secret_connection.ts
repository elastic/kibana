/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Secret-provider backend discriminator. Only HashiCorp Vault is implemented
 * today, but the connection model below is deliberately shaped so other providers
 * (CyberArk, Azure Key Vault, AWS Secrets Manager) are *additive*: to add one you
 * add a literal here, a `<provider>Config`/`<provider>Secrets` pair, a member to
 * `SecretProviderConnection`, and a resolver on the agent.
 */
export type SecretProviderType = 'hashicorp_vault';

export const SECRET_PROVIDER_HASHICORP_VAULT: SecretProviderType = 'hashicorp_vault';

export type VaultAuthMethod = 'token' | 'approle';

/** Non-secret, provider-specific settings. Safe to return to the browser. */
export interface HashiCorpVaultConfig {
  address: string;
  authMethod: VaultAuthMethod;
  namespace?: string;
  kvMount?: string;
  tlsSkipVerify?: boolean;
  // approle: the role id is not a secret (the secret_id is).
  roleId?: string;
  // Hosts that monitors using this connection may connect to. Delivered to Heartbeat as
  // `allowed_hosts`; empty or omitted means any host. Not the Vault server allow-list.
  allowedMonitorHosts?: string[];
}

/** Secret, provider-specific settings. Encrypted at rest as one blob. */
export interface HashiCorpVaultSecrets {
  token?: string;
  secretId?: string;
}

/**
 * A stored secret-provider connection, as a space-scoped encrypted saved object:
 * the whole `secrets` blob is encrypted at rest. Delivered to Heartbeat through
 * the Fleet package policy so the agent can resolve vault references at the edge.
 * A discriminated union on `type` once a second provider lands.
 */
export interface SecretProviderConnection {
  // Unique connection name.
  name: string;
  type: 'hashicorp_vault';
  config: HashiCorpVaultConfig;
  // Bumped on save so agents re-resolve.
  refreshedAt?: string;
  secrets?: HashiCorpVaultSecrets;
  // Non-secret marker so the (non-decrypting) list read can report "secret saved".
  hasSecret?: boolean;
}

/** Back-compat alias for the stored connection type. */
export type SyntheticsSecretConnection = SecretProviderConnection;

/**
 * The safe, secret-free view of a connection returned to the browser: the
 * non-secret provider `config` verbatim, plus a `hasSecret` flag so the UI can
 * render "•••• saved" without ever receiving the value.
 */
export interface SecretConnectionStatus {
  configured: boolean;
  name?: string;
  type?: SecretProviderType;
  refreshedAt?: string;
  config?: HashiCorpVaultConfig;
  hasSecret?: boolean;
}

export type AffectedMonitorReason = 'monitor_type' | 'redirects' | 'host';

/** A monitor Heartbeat will refuse to run with a connection once it has allowed monitor hosts. */
export interface AffectedMonitor {
  name: string;
  reason: AffectedMonitorReason;
}

/** Monitors that Heartbeat would refuse to run with a connection, capped, plus the full count. */
export interface AffectedMonitorsResult {
  monitors: AffectedMonitor[];
  total: number;
}

/** Per connection name, for the saved connections that have allowed monitor hosts. */
export type SecretConnectionAffectedMonitors = Record<string, AffectedMonitorsResult>;

/** Outcome of `POST /_test`: whether Kibana could reach Vault and authenticate. */
export interface SecretConnectionTestResult {
  ok: boolean;
  message: string;
}
