/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectsFullModelVersion } from '@kbn/core-saved-objects-server';
import type { SavedObjectsType } from '@kbn/core/server';
import { schema } from '@kbn/config-schema';

export const EntityStoreResolutionRuleOverridesTypeName = 'entity-store-resolution-rule-overrides';

// No fields are mapped/indexed because nothing queries this SO by its contents:
// we always fetch the single per-namespace document by its deterministic id and
// read the whole `overrides` map. With `dynamic: false` the map is still stored in
// `_source` and returned on read — it just isn't indexed for search/filtering.
export const EntityStoreResolutionRuleOverridesTypeMappings: SavedObjectsType['mappings'] = {
  dynamic: false,
  properties: {},
};

const overridesSchemaV1 = schema.object({
  overrides: schema.recordOf(
    schema.string({ maxLength: 256 }),
    schema.object({ enabled: schema.boolean() })
  ),
});

const version1: SavedObjectsFullModelVersion = {
  changes: [],
  schemas: {
    create: overridesSchemaV1,
    forwardCompatibility: overridesSchemaV1.extends({}, { unknowns: 'ignore' }),
  },
};

export const EntityStoreResolutionRuleOverridesType: SavedObjectsType = {
  name: EntityStoreResolutionRuleOverridesTypeName,
  hidden: false,
  namespaceType: 'multiple-isolated',
  mappings: EntityStoreResolutionRuleOverridesTypeMappings,
  modelVersions: { 1: version1 },
  hiddenFromHttpApis: true,
};
