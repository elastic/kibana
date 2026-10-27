/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { schema } from '@kbn/config-schema';
import type { SavedObjectsType } from '@kbn/core/server';
import type { EncryptedSavedObjectsPluginStart } from '@kbn/encrypted-saved-objects-plugin/server';
import { v5 as uuidv5 } from 'uuid';
import { syntheticsSecretConnectionType } from '../../common/types/saved_objects';

// The type is hidden, so a client created without it cannot read any connection.
export const getSecretConnectionEncryptedClient = (
  encryptedSavedObjects: EncryptedSavedObjectsPluginStart
) => encryptedSavedObjects.getClient({ includedHiddenTypes: [syntheticsSecretConnectionType] });

// Encrypted saved objects require predefined ids to be UUIDs. We derive a stable
// UUID per (space, connection name) so the name is the key (upsert by name) while
// the SO id stays a valid UUID.
//
// The space MUST be part of the id: the type is `namespaceType: 'multiple-isolated'` (a
// single global id space), so deriving from the name alone collides across spaces
// — creating "prod" in one space would fail with an unresolvable-conflict when
// another space already has it, and the 409 would leak which names exist elsewhere.
const SECRET_CONNECTION_NAMESPACE = '5efab9a0-0000-4000-8000-000000000001';
export const secretConnectionId = (name: string, spaceId: string) =>
  uuidv5(`${spaceId}:${name}`, SECRET_CONNECTION_NAMESPACE);

// The provider-specific secret fields live under a single `secrets` attribute,
// which is encrypted as one blob. This is what keeps the encryption model stable
// as providers are added: a new provider adds fields inside `secrets`/`config`,
// never a new top-level attribute, so this declaration never has to change.
export const SYNTHETICS_SECRET_CONNECTION_ENCRYPTED_TYPE = {
  type: syntheticsSecretConnectionType,
  attributesToEncrypt: new Set(['secrets']),
  attributesToIncludeInAAD: new Set(['name', 'type', 'config']),
};

// Unknown attributes are kept (not stripped) so a rollback never drops encrypted secrets
// written by a newer version. `secrets` is deliberately not declared: encrypted saved
// objects validate it after encryption, when it is no longer an object.
const secretConnectionSchemaV1 = schema.object(
  {
    name: schema.string({ maxLength: 2048 }),
    type: schema.string({ maxLength: 64 }),
    config: schema.object({}, { unknowns: 'allow' }),
    refreshedAt: schema.maybe(schema.string({ maxLength: 64 })),
    hasSecret: schema.maybe(schema.boolean()),
  },
  { unknowns: 'allow' }
);

export const syntheticsSecretConnectionSavedObjectType: SavedObjectsType = {
  name: syntheticsSecretConnectionType,
  hidden: true,
  namespaceType: 'multiple-isolated',
  mappings: {
    dynamic: false,
    properties: {},
  },
  modelVersions: {
    1: {
      changes: [],
      schemas: { create: secretConnectionSchemaV1, forwardCompatibility: secretConnectionSchemaV1 },
    },
  },
  management: {
    importableAndExportable: false,
    icon: 'lock',
  },
};
