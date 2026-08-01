/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { SavedObjectsType } from '@kbn/core/server';
import { v5 as uuidv5 } from 'uuid';
import { syntheticsVaultConnectionType } from '../../common/types/saved_objects';

// Encrypted saved objects require predefined ids to be UUIDs. We derive a stable
// UUID per connection name so the name is the key (upsert by name) while the SO
// id stays a valid UUID.
const VAULT_CONNECTION_NAMESPACE = '5efab9a0-0000-4000-8000-000000000001';
export const vaultConnectionId = (name: string) => uuidv5(name, VAULT_CONNECTION_NAMESPACE);

export const SYNTHETICS_VAULT_CONNECTION_ENCRYPTED_TYPE = {
  type: syntheticsVaultConnectionType,
  attributesToEncrypt: new Set(['token', 'secretId']),
  attributesToIncludeInAAD: new Set([
    'name',
    'address',
    'namespace',
    'authMethod',
    'roleId',
    'kvMount',
    'tlsSkipVerify',
    'secretRefreshInterval',
    'refreshedAt',
  ]),
};

export const syntheticsVaultConnectionSavedObjectType: SavedObjectsType = {
  name: syntheticsVaultConnectionType,
  hidden: false,
  namespaceType: 'multiple',
  mappings: {
    dynamic: false,
    properties: {},
  },
  management: {
    importableAndExportable: false,
    icon: 'lock',
  },
};
