/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectsType } from '@kbn/core-saved-objects-server';
import { SECURITY_SOLUTION_SAVED_OBJECT_INDEX } from '@kbn/core-saved-objects-server';
import { schema } from '@kbn/config-schema';
import { SCRIPTS_LIBRARY_SAVED_OBJECT_TYPE } from '../constants';

const ScriptsLibraryAttributesSchemaV1 = schema.object({
  id: schema.string(),
  name: schema.string(),
  platform: schema.string(),
  hash: schema.maybe(schema.string()),
  requires_input: schema.maybe(schema.boolean()),
  description: schema.maybe(schema.string()),
  instructions: schema.maybe(schema.string()),
  example: schema.maybe(schema.string()),
  executable: schema.maybe(
    schema.object({
      linux: schema.maybe(schema.string()),
      macos: schema.maybe(schema.string()),
      windows: schema.maybe(schema.string()),
    })
  ),
  created_by: schema.string(),
  updated_by: schema.string(),
});

export const scriptsLibrarySavedObjectType: SavedObjectsType = {
  name: SCRIPTS_LIBRARY_SAVED_OBJECT_TYPE,
  indexPattern: SECURITY_SOLUTION_SAVED_OBJECT_INDEX,
  namespaceType: 'multiple',
  hidden: true,
  mappings: {
    dynamic: false,
    properties: {
      id: { type: 'keyword' },
      name: { type: 'keyword' },
      platform: { type: 'keyword' },
      hash: { type: 'keyword' },
      requires_input: { type: 'boolean' },
      description: { type: 'keyword' },
      instructions: { type: 'keyword' },
      example: { type: 'keyword' },
      executable: {
        properties: {
          linux: { type: 'keyword' },
          macos: { type: 'keyword' },
          windows: { type: 'keyword' },
        },
      },
      created_by: { type: 'keyword' },
      updated_by: { type: 'keyword' },
      // FYI: the created_at/_by fields are auto populated by the so framework
    },
  },
  modelVersions: {
    1: {
      changes: [],
      schemas: {
        forwardCompatibility: ScriptsLibraryAttributesSchemaV1.extends({}, { unknowns: 'ignore' }),
        create: ScriptsLibraryAttributesSchemaV1,
      },
    },
  },
};
