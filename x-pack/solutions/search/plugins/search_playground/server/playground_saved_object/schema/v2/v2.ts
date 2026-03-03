/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema, type TypeOf } from '@kbn/config-schema';
import type {
  SavedObjectModelTransformationDoc,
  SavedObjectModelUnsafeTransformFn,
} from '@kbn/core-saved-objects-server';
import type { SavedPlaygroundV1 } from '../v1/v1';

export const playgroundAttributesSchemaV2 = schema.object({
  name: schema.string({ minLength: 1, maxLength: 50 }),
  // Common fields
  indices: schema.arrayOf(schema.string(), { minSize: 1, maxSize: 100 }),
  queryFields: schema.recordOf(
    schema.string(),
    schema.arrayOf(schema.string(), { minSize: 1, maxSize: 100 })
  ),
  elasticsearchQueryJSON: schema.string(),
  userElasticsearchQueryJSON: schema.maybe(schema.string()),
  // Chat fields
  prompt: schema.maybe(schema.string()),
  citations: schema.maybe(schema.boolean()),
  context: schema.maybe(
    schema.object({
      sourceFields: schema.recordOf(
        schema.string(),
        schema.arrayOf(schema.string(), { minSize: 1, maxSize: 100 })
      ),
      docSize: schema.number({ defaultValue: 3, min: 1 }),
    })
  ),
  summarizationModel: schema.maybe(
    schema.object({
      connectorId: schema.string(),
      modelId: schema.maybe(schema.string()),
    })
  ),
});

export type SavedPlaygroundV2 = TypeOf<typeof playgroundAttributesSchemaV2>;

function truncateFields(fields: Record<string, string[]>): Record<string, string[]> {
  const truncatedFields: Record<string, string[]> = {};
  Object.entries(fields).forEach(([key, value]) => {
    if (value.length > 100) {
      truncatedFields[key] = value.slice(0, 100);
    } else {
      truncatedFields[key] = value;
    }
  });
  return truncatedFields;
}

export const transformV1ToV2: SavedObjectModelUnsafeTransformFn<
  SavedPlaygroundV1,
  SavedPlaygroundV2
> = (doc) => {
  const v1Doc = doc.attributes;
  const indices = v1Doc.indices.length > 100 ? v1Doc.indices.slice(0, 100) : v1Doc.indices;
  let context: SavedPlaygroundV2['context'];
  if (v1Doc.context) {
    context = {
      ...v1Doc.context,
      sourceFields: truncateFields(v1Doc.context.sourceFields),
    };
  }

  const v2Doc: SavedObjectModelTransformationDoc<SavedPlaygroundV2> = {
    ...doc,
    attributes: {
      ...v1Doc,
      indices,
      queryFields: truncateFields(v1Doc.queryFields),
      context,
    },
  };
  return { document: v2Doc };
};
