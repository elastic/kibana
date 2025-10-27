/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectsServiceSetup } from '@kbn/core/server';
import type { EncryptedSavedObjectsPluginSetup } from '@kbn/encrypted-saved-objects-plugin/server';
import { workplaceConnectorMappings } from './mappings';

export const WORKPLACE_CONNECTOR_SAVED_OBJECT_TYPE = 'workplace_connector';

export function setupSavedObjects(
  savedObjects: SavedObjectsServiceSetup,
  encryptedSavedObjects: EncryptedSavedObjectsPluginSetup
) {
  savedObjects.registerType({
    name: WORKPLACE_CONNECTOR_SAVED_OBJECT_TYPE,
    hidden: false,
    namespaceType: 'multiple-isolated',
    mappings: workplaceConnectorMappings,
    management: {
      displayName: 'Workplace Connector',
      defaultSearchField: 'name',
      importableAndExportable: false,
      getTitle(obj) {
        const attrs = obj.attributes as unknown as { name?: string };
        return attrs.name ?? 'Workplace Connector';
      },
    },
  });

  // Register encrypted saved object type
  // Secrets will be encrypted, everything else will be in AAD (Additional Authenticated Data)
  encryptedSavedObjects.registerType({
    type: WORKPLACE_CONNECTOR_SAVED_OBJECT_TYPE,
    attributesToEncrypt: new Set(['secrets']),
    // Important: Do not include mutable attributes in AAD, or decryption will fail
    // after updates (e.g., when adding/updating workflowId or config).
    attributesToIncludeInAAD: new Set(),
  });
}
