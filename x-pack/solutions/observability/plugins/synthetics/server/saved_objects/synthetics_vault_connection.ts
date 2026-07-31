/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { SavedObjectsType } from '@kbn/core/server';
import { syntheticsVaultConnectionType } from '../../common/types/saved_objects';

// A single connection per space; a fixed id keeps it a singleton. Encrypted
// saved objects require predefined ids to be UUIDs, so we use a fixed UUID.
export const VAULT_CONNECTION_SO_ID = '5efab9a0-0000-4000-8000-000000000001';

export const SYNTHETICS_VAULT_CONNECTION_ENCRYPTED_TYPE = {
  type: syntheticsVaultConnectionType,
  attributesToEncrypt: new Set(['token', 'secretId']),
  attributesToIncludeInAAD: new Set([
    'address',
    'namespace',
    'authMethod',
    'roleId',
    'kvMount',
    'tlsSkipVerify',
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
