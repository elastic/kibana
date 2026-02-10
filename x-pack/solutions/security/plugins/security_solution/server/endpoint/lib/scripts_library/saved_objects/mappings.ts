/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectsType } from '@kbn/core-saved-objects-server';
import { SECURITY_SOLUTION_SAVED_OBJECT_INDEX } from '@kbn/core-saved-objects-server';
import { schema, type TypeOf } from '@kbn/config-schema';
import type { DeepMutable } from '../../../../../common/endpoint/types';
import { SCRIPTS_LIBRARY_SAVED_OBJECT_TYPE } from '../constants';

const ScriptsLibraryAttributesSchemaV1 = schema.object({
  id: schema.string(),
  name: schema.string(),
  platform: schema.arrayOf(schema.string()),
  file_id: schema.string(),
  file_name: schema.string(),
  file_size: schema.number(),
  file_hash_sha256: schema.string(),
  requires_input: schema.maybe(schema.boolean()),
  description: schema.maybe(schema.string()),
  instructions: schema.maybe(schema.string()),
  example: schema.maybe(schema.string()),
  path_to_executable: schema.maybe(schema.string()),
  tags: schema.maybe(schema.arrayOf(schema.string())),
  created_by: schema.string(),
  created_at: schema.string(),
  updated_by: schema.string(),
  updated_at: schema.string(),
});

export type ScriptsLibrarySavedObjectAttributes = DeepMutable<
  TypeOf<typeof ScriptsLibraryAttributesSchemaV1>
>;

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
      file_id: { type: 'keyword' },
      file_name: { type: 'keyword' },
      file_size: { type: 'long' },
      file_hash_sha256: { type: 'keyword' },
      requires_input: { type: 'boolean' },
      description: { type: 'keyword' },
      instructions: { type: 'keyword' },
      example: { type: 'keyword' },
      path_to_executable: { type: 'keyword' },
      tags: { type: 'keyword' },
      created_by: { type: 'keyword' },
      created_at: { type: 'date' },
      updated_by: { type: 'keyword' },
      updated_at: { type: 'date' },
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
