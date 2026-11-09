/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import type { SavedObjectsModelVersionMap } from '@kbn/core-saved-objects-server';

/**
 * Both saved object types, `exception-list` and `exception-list-agnostic`, hold lists and items in one document shape,
 * told apart by `list_type`. The schemas describe every attribute of that shape and allow the unknown ones, because
 * the services write only a part of them and the shape has no validation of its own.
 */
const innerEntrySchema = schema.object(
  {
    field: schema.maybe(schema.string()),
    operator: schema.maybe(schema.string()),
    type: schema.maybe(schema.string()),
    value: schema.maybe(schema.oneOf([schema.string(), schema.arrayOf(schema.string())])),
  },
  { unknowns: 'allow' }
);

const entrySchemaV1 = innerEntrySchema.extends(
  {
    entries: schema.maybe(schema.arrayOf(innerEntrySchema)),
    list: schema.maybe(
      schema.object(
        { id: schema.maybe(schema.string()), type: schema.maybe(schema.string()) },
        { unknowns: 'allow' }
      )
    ),
  },
  { unknowns: 'allow' }
);

export const exceptionListSchemaV1 = schema.object(
  {
    _tags: schema.maybe(schema.arrayOf(schema.string())),
    comments: schema.maybe(schema.arrayOf(schema.object({}, { unknowns: 'allow' }))),
    created_at: schema.maybe(schema.string()),
    created_by: schema.maybe(schema.string()),
    description: schema.maybe(schema.string()),
    entries: schema.maybe(schema.arrayOf(entrySchemaV1)),
    expire_time: schema.maybe(schema.string()),
    immutable: schema.maybe(schema.boolean()),
    item_id: schema.maybe(schema.string()),
    list_id: schema.maybe(schema.string()),
    list_type: schema.maybe(schema.string()),
    meta: schema.maybe(schema.recordOf(schema.string(), schema.any())),
    name: schema.maybe(schema.string()),
    os_types: schema.maybe(schema.arrayOf(schema.string())),
    tags: schema.maybe(schema.arrayOf(schema.string())),
    tie_breaker_id: schema.maybe(schema.string()),
    type: schema.maybe(schema.string()),
    updated_by: schema.maybe(schema.string()),
    // a list has the number that it was created with, and an item has none
    version: schema.maybe(schema.nullable(schema.number())),
  },
  { unknowns: 'allow' }
);

/** Adds what an item that applies to the ES|QL output columns needs: `applies_to` on the item and `column_type` on its entries. */
export const exceptionListSchemaV2 = exceptionListSchemaV1.extends(
  {
    applies_to: schema.maybe(schema.string()),
    entries: schema.maybe(
      schema.arrayOf(
        entrySchemaV1.extends({ column_type: schema.maybe(schema.string()) }, { unknowns: 'allow' })
      )
    ),
  },
  { unknowns: 'allow' }
);

export const exceptionListModelVersions: SavedObjectsModelVersionMap = {
  // The baseline: the shape that the type had before it used model versions. It has no changes.
  1: {
    changes: [],
    schemas: {
      create: exceptionListSchemaV1,
      forwardCompatibility: exceptionListSchemaV1.extends({}, { unknowns: 'ignore' }),
    },
  },
  2: {
    changes: [
      {
        addedMappings: {
          applies_to: { ignore_above: 1024, type: 'keyword' },
          entries: {
            properties: {
              column_type: { ignore_above: 1024, type: 'keyword' },
            },
          },
        },
        type: 'mappings_addition',
      },
    ],
    schemas: {
      create: exceptionListSchemaV2,
      forwardCompatibility: exceptionListSchemaV2.extends({}, { unknowns: 'ignore' }),
    },
  },
};
