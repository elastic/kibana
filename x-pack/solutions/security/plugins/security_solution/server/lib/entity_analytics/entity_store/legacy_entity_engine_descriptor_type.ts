/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SECURITY_SOLUTION_SAVED_OBJECT_INDEX } from '@kbn/core-saved-objects-server';
import type { SavedObjectsType } from '@kbn/core/server';

// Saved object type name for the legacy v1 entity engine descriptor.
//
// The v1 Entity Store has been removed (data clients, routes, tasks). This
// registration is retained solely so the v2 install hook can detect whether
// the user previously had v1 enabled in non-default spaces (via
// `/api/saved_objects/_find?type=entity-engine-status`) and decide whether to
// auto-install v2. Once we are confident no environments still hold v1
// descriptors, this can be deleted.
export const legacyEntityEngineDescriptorTypeName = 'entity-engine-status';

export const legacyEntityEngineDescriptorType: SavedObjectsType = {
  name: legacyEntityEngineDescriptorTypeName,
  indexPattern: SECURITY_SOLUTION_SAVED_OBJECT_INDEX,
  hidden: false,
  namespaceType: 'multiple-isolated',
  mappings: {
    dynamic: false,
    properties: {},
  },
};
