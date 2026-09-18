/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v5 as uuidv5 } from 'uuid';
import type { SavedObjectsType } from '@kbn/core/server';
import type { EncryptedSavedObjectTypeRegistration } from '@kbn/encrypted-saved-objects-plugin/server';

/**
 * The API key the coalesced-range rebuild task authenticates with, one object per
 * list index. The key is granted on behalf of the writing user and scoped to that one
 * index, so it must not sit in task params in the clear; it lives here, encrypted.
 * The object is always written whole with `overwrite`, never partially updated, so the
 * encrypted attribute and the AAD attribute stay consistent.
 */
export const COALESCE_REBUILD_API_KEY_SO_TYPE = 'lists-coalesce-rebuild-api-key';

const SO_ID_NAMESPACE = '7f4a6a9e-2b1e-4c6d-9d0c-5a2f0e8b1c3d';

/** Deterministic object id per list index, so a re-grant overwrites the previous key. */
export const coalesceRebuildApiKeySoId = (index: string): string => uuidv5(index, SO_ID_NAMESPACE);

export interface CoalesceRebuildApiKeyAttributes {
  /** Base64 `id:api_key`, ready for an `ApiKey` authorization header. Encrypted. */
  apiKey: string;
  /** The Elasticsearch API key id, kept in the clear so the previous key can be invalidated. */
  apiKeyId: string;
  /** The list index the key is scoped to. In AAD, never changes for a given object. */
  index: string;
}

export const coalesceRebuildApiKeyType: SavedObjectsType = {
  hidden: true,
  management: {
    displayName: 'Value list coalesced-range rebuild API key',
    importableAndExportable: false,
  },
  mappings: { dynamic: false, properties: {} },
  name: COALESCE_REBUILD_API_KEY_SO_TYPE,
  namespaceType: 'agnostic',
};

export const coalesceRebuildApiKeyEncryption: EncryptedSavedObjectTypeRegistration = {
  attributesToEncrypt: new Set(['apiKey']),
  attributesToIncludeInAAD: new Set(['index']),
  type: COALESCE_REBUILD_API_KEY_SO_TYPE,
};
