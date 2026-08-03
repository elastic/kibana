/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SyntheticsVaultConnection } from '../../common/runtime_types';
import { syntheticsVaultConnectionType } from '../../common/types/saved_objects';
import type { SyntheticsServerSetup } from '../types';

/**
 * A Heartbeat-shaped `vault:` connection, assembled from an encrypted connection
 * saved object. This is what Heartbeat's resolver reads to expand
 * ${vault/[<name>@]<path>#<field>} references. Snake-cased to match Heartbeat
 * (go-ucfg) config keys.
 */
export interface HeartbeatVaultConfig {
  enabled: true;
  name: string;
  // Secret-provider backend. Heartbeat's resolver factory switches on this; it
  // defaults to hashicorp_vault when absent. The provider-specific fields below are
  // flattened onto the wire blob (the stored connection keeps them under
  // config/secrets), so a new provider adds fields here plus an agent resolver.
  type: string;
  address: string;
  auth_method: 'token' | 'approle';
  kv_mount?: string;
  namespace?: string;
  tls_skip_verify?: boolean;
  secret_refresh_interval?: string;
  // Opaque version (the connection's refreshedAt). Bumping it changes the blob,
  // which forces the agent to re-resolve — the manual "refresh" mechanism.
  version?: string;
  token?: string;
  role_id?: string;
  secret_id?: string;
}

const toHeartbeatConfig = (attributes: SyntheticsVaultConnection): HeartbeatVaultConfig => ({
  enabled: true,
  name: attributes.name,
  type: attributes.type,
  address: attributes.config.address,
  auth_method: attributes.config.authMethod,
  kv_mount: attributes.config.kvMount,
  namespace: attributes.config.namespace,
  tls_skip_verify: attributes.config.tlsSkipVerify,
  secret_refresh_interval: attributes.secretRefreshInterval,
  version: attributes.refreshedAt,
  token: attributes.secrets?.token,
  role_id: attributes.config.roleId,
  secret_id: attributes.secrets?.secretId,
});

/**
 * Reads and decrypts every Vault connection for a space and returns them as an
 * array of Heartbeat `vault:` connection blocks. Empty when none are configured.
 *
 * Note: this yields plaintext secrets, so it must only be used when assembling
 * the config delivered to a private-location agent (via a Fleet secret) — never
 * returned to the browser.
 */
export const getVaultConnectionConfigs = async (
  server: SyntheticsServerSetup,
  spaceId: string
): Promise<HeartbeatVaultConfig[]> => {
  // Resilient by design: this is fetched once per policy-sync (E1) up front, so a
  // failure here must NOT break the whole batch (including monitors that use no
  // vault). Degrade to "no connections" — non-vault monitors are unaffected, and a
  // vault monitor with a now-missing connection fails closed at its own policy
  // generation rather than taking the sync down.
  try {
    const encryptedClient = server.encryptedSavedObjects.getClient();
    const finder =
      await encryptedClient.createPointInTimeFinderDecryptedAsInternalUser<SyntheticsVaultConnection>(
        {
          type: syntheticsVaultConnectionType,
          perPage: 1000,
          namespaces: [spaceId],
        }
      );

    const configs: HeartbeatVaultConfig[] = [];
    for await (const result of finder.find()) {
      for (const so of result.saved_objects) {
        // Skip decrypt-failed objects (attributes stripped) rather than emitting a
        // connection with no secret.
        if (so.error || !so.attributes) continue;
        configs.push(toHeartbeatConfig(so.attributes));
      }
    }
    finder.close().catch(() => {});
    return configs;
  } catch (e) {
    server.logger?.error(`Vault: failed to load connections for space "${spaceId}": ${e.message}`);
    return [];
  }
};
