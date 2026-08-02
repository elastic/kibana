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

// The provider-specific secret fields live under a single `secrets` attribute,
// which is encrypted as one blob. This is what keeps the encryption model stable
// as providers are added: a new provider adds fields inside `secrets`/`config`,
// never a new top-level attribute, so this declaration never has to change.
export const SYNTHETICS_VAULT_CONNECTION_ENCRYPTED_TYPE = {
  type: syntheticsVaultConnectionType,
  attributesToEncrypt: new Set(['secrets']),
  attributesToIncludeInAAD: new Set([
    'name',
    'type',
    'config',
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
