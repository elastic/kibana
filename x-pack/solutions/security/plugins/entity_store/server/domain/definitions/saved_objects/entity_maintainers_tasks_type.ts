/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectsFullModelVersion } from '@kbn/core-saved-objects-server';
import type { SavedObjectsType } from '@kbn/core/server';
import { schema } from '@kbn/config-schema';

export const EntityMaintainersTasksTypeName = 'entity-maintainers-tasks';
export const EntityMaintainersTasksSingletonId = 'entity-maintainers-tasks';

export const EntityMaintainersTasksTypeMappings: SavedObjectsType['mappings'] = {
  dynamic: false,
  properties: {
    'entity-maintainers-tasks': {
      type: 'nested',
      properties: {
        id: { type: 'keyword' },
        interval: { type: 'keyword' },
      },
    },
  },
};

const entityMaintainerTaskEntrySchema = schema.object({
  id: schema.string(),
  interval: schema.string(),
});

const entityMaintainersTasksAttributesSchema = {
  'entity-maintainers-tasks': schema.arrayOf(entityMaintainerTaskEntrySchema),
};

const version1: SavedObjectsFullModelVersion = {
  changes: [],
  schemas: {
    create: schema.object(entityMaintainersTasksAttributesSchema),
    forwardCompatibility: schema.object(entityMaintainersTasksAttributesSchema, {
      unknowns: 'ignore',
    }),
  },
};

export const EntityMaintainersTasksType: SavedObjectsType = {
  name: EntityMaintainersTasksTypeName,
  hidden: true,
  namespaceType: 'single',
  mappings: EntityMaintainersTasksTypeMappings,
  modelVersions: { 1: version1 },
  hiddenFromHttpApis: true,
};
