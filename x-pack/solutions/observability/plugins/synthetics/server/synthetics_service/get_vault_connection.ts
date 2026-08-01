/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SavedObjectsErrorHelpers } from '@kbn/core/server';
import type { SyntheticsVaultConnection } from '../../common/runtime_types';
import { syntheticsVaultConnectionType } from '../../common/types/saved_objects';
import { VAULT_CONNECTION_SO_ID } from '../saved_objects/synthetics_vault_connection';
import type { SyntheticsServerSetup } from '../types';

/**
 * The Heartbeat-shaped `vault:` config block, assembled from the encrypted
 * connection saved object. This is the block Heartbeat's config resolver reads
 * to expand ${vault/<path>#<field>} references. Snake-cased to match Heartbeat
 * (go-ucfg) config keys.
 */
export interface HeartbeatVaultConfig {
  enabled: true;
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

/**
 * Reads and decrypts the Vault connection for a space and returns it as a
 * Heartbeat `vault:` config block, or null when no connection is configured.
 *
 * Note: this yields the plaintext secret, so it must only be used when
 * assembling the config delivered to a private-location agent — never returned
 * to the browser. Delivering this block to agent-run Heartbeat through the
 * Fleet policy requires the synthetics integration package to carry it; see the
 * POC notes.
 */
export const getVaultConnectionConfig = async (
  server: SyntheticsServerSetup,
  spaceId: string
): Promise<HeartbeatVaultConfig | null> => {
  const encryptedClient = server.encryptedSavedObjects.getClient();
  try {
    const { attributes } =
      await encryptedClient.getDecryptedAsInternalUser<SyntheticsVaultConnection>(
        syntheticsVaultConnectionType,
        VAULT_CONNECTION_SO_ID,
        { namespace: spaceId }
      );

    return {
      enabled: true,
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
    };
  } catch (error) {
    if (SavedObjectsErrorHelpers.isNotFoundError(error)) {
      return null;
    }
    throw error;
  }
};
