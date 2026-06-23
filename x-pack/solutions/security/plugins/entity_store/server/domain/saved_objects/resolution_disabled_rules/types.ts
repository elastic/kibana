/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectsFullModelVersion } from '@kbn/core-saved-objects-server';
import type { SavedObjectsType } from '@kbn/core/server';
import { schema } from '@kbn/config-schema';

export const EntityStoreResolutionDisabledRulesTypeName = 'entity-store-resolution-disabled-rules';

// No fields are mapped/indexed because nothing queries this SO by its contents:
// we always fetch the single per-namespace document by its deterministic id and
// read the whole `disabledRuleIds` list. With `dynamic: false` the list is still
// stored in `_source` and returned on read — it just isn't indexed for search.
export const EntityStoreResolutionDisabledRulesTypeMappings: SavedObjectsType['mappings'] = {
  dynamic: false,
  properties: {},
};

const disabledRulesSchemaV1 = schema.object({
  disabledRuleIds: schema.arrayOf(schema.string({ maxLength: 256 }), { maxSize: 1000 }),
});

const version1: SavedObjectsFullModelVersion = {
  changes: [],
  schemas: {
    create: disabledRulesSchemaV1,
    forwardCompatibility: disabledRulesSchemaV1.extends({}, { unknowns: 'ignore' }),
  },
};

export const EntityStoreResolutionDisabledRulesType: SavedObjectsType = {
  name: EntityStoreResolutionDisabledRulesTypeName,
  hidden: false,
  namespaceType: 'multiple-isolated',
  mappings: EntityStoreResolutionDisabledRulesTypeMappings,
  modelVersions: { 1: version1 },
  hiddenFromHttpApis: true,
};
