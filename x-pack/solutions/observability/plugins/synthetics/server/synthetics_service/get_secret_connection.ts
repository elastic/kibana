/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getFleetSecretStorageEnabled } from './fleet_secret_storage';
import type { SyntheticsSecretConnection } from '../../common/runtime_types';
import { syntheticsSecretConnectionType } from '../../common/types/saved_objects';
import type { SyntheticsServerSetup } from '../types';
import { isSecretConnectionsEnabled } from '../config';
import { getSecretConnectionEncryptedClient } from '../saved_objects/synthetics_secret_connection';
import {
  getAllowedHosts,
  isAddressHostAllowed,
} from '../routes/settings/secret_connection/address_guard';

/**
 * A Heartbeat `secret_stores` entry of type `vault`, assembled from an encrypted
 * connection saved object. Heartbeat resolves `vault://<name>@<path>#<field>`
 * references with it. Snake-cased to match Heartbeat (go-ucfg) config keys.
 */
export interface HeartbeatVaultConfig {
  type: 'vault';
  // Selects this entry in references: `vault://<name>@<path>#<field>`.
  name: string;
  address: string;
  namespace?: string;
  kv_mount?: string;
  auth: { token: string } | { approle: { role_id: string; secret_id: string } };
  ssl?: { verification_mode: 'none' };
  // Opaque version (the connection's refreshedAt). Heartbeat shares one store (and
  // its 5 minute secret cache) per distinct entry, so bumping this on save forces
  // fresh reads.
  version?: string;
}

/** A reference Kibana can't deliver (unnamed or unknown connection); shown to the user. */
export class SecretConnectionError extends Error {}

const toHeartbeatConfig = (attributes: SyntheticsSecretConnection): HeartbeatVaultConfig => {
  const { config, secrets } = attributes;
  return {
    type: 'vault',
    name: attributes.name,
    address: config.address,
    namespace: config.namespace,
    kv_mount: config.kvMount,
    auth:
      config.authMethod === 'approle'
        ? { approle: { role_id: config.roleId ?? '', secret_id: secrets?.secretId ?? '' } }
        : { token: secrets?.token ?? '' },
    ...(config.tlsSkipVerify ? { ssl: { verification_mode: 'none' as const } } : {}),
    version: attributes.refreshedAt,
  };
};

/**
 * Reads and decrypts every Vault connection for a space and returns them as an
 * array of Heartbeat `secret_stores` vault entries. Empty when none are configured.
 *
 * Note: this yields plaintext secrets, so it must only be used when assembling
 * the config delivered to a private-location agent (via a Fleet secret) — never
 * returned to the browser.
 */
export const getSecretConnectionConfigs = async (
  server: SyntheticsServerSetup,
  spaceId: string
): Promise<HeartbeatVaultConfig[]> => {
  if (!isSecretConnectionsEnabled(server.config)) return [];
  // Resilient by design: this is fetched once per policy-sync (E1) up front, so a
  // failure here must NOT break the whole batch (including monitors that use no
  // vault). Degrade to "no connections" — non-vault monitors are unaffected, and a
  // vault monitor with a now-missing connection fails closed at its own policy
  // generation rather than taking the sync down.
  try {
    const encryptedClient = getSecretConnectionEncryptedClient(server.encryptedSavedObjects);
    const finder =
      await encryptedClient.createPointInTimeFinderDecryptedAsInternalUser<SyntheticsSecretConnection>(
        {
          type: syntheticsSecretConnectionType,
          perPage: 1000,
          namespaces: [spaceId],
        }
      );

    const allowedHosts = getAllowedHosts(server.config);
    const configs: HeartbeatVaultConfig[] = [];
    for await (const result of finder.find()) {
      for (const so of result.saved_objects) {
        // Skip decrypt-failed objects (attributes stripped) rather than emitting a
        // connection with no secret.
        if (so.error || !so.attributes) continue;
        // The list may have been tightened after the connection was saved.
        if (!isAddressHostAllowed(so.attributes.config.address, allowedHosts)) {
          server.logger?.warn(
            `Vault connection "${so.attributes.name}" is not delivered: its host is not in xpack.synthetics.secretConnections.allowedHosts`
          );
          continue;
        }
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

/** Connections to deliver plus whether Fleet can store them as secrets (fails closed). */
export const getSecretConnectionDelivery = async (
  server: SyntheticsServerSetup,
  spaceId: string
): Promise<{ secretConnections: HeartbeatVaultConfig[]; secretStorageEnabled: boolean }> => {
  const secretConnections = await getSecretConnectionConfigs(server, spaceId);
  const secretStorageEnabled =
    secretConnections.length === 0 || (await getFleetSecretStorageEnabled(server, false));
  return { secretConnections, secretStorageEnabled };
};
