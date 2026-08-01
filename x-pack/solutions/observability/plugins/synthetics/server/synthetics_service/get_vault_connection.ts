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
  address: attributes.address,
  auth_method: attributes.authMethod,
  kv_mount: attributes.kvMount,
  namespace: attributes.namespace,
  tls_skip_verify: attributes.tlsSkipVerify,
  secret_refresh_interval: attributes.secretRefreshInterval,
  version: attributes.refreshedAt,
  token: attributes.token,
  role_id: attributes.roleId,
  secret_id: attributes.secretId,
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
      if (so.attributes) {
        configs.push(toHeartbeatConfig(so.attributes));
      }
    }
  }
  finder.close().catch(() => {});

  return configs;
};
