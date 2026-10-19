/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectsType } from '@kbn/core/server';
import { schema, type TypeOf } from '@kbn/config-schema';
import {
  MAX_SOURCE_SLUG_LENGTH,
  MAX_SOURCE_TAG_LENGTH,
  MAX_SOURCE_TAGS,
  MAX_SOURCE_VIEW_NAME_LENGTH,
  NIGHTSHIFT_SOURCE_SO_TYPE,
  type SourceType,
} from '@kbn/nightshift-shared';

export { NIGHTSHIFT_SOURCE_SO_TYPE };

const nightshiftSourceAttributesSchemaV1 = schema.object({
  title: schema.string(),
  description: schema.maybe(schema.string()),
  tags: schema.arrayOf(schema.string({ maxLength: MAX_SOURCE_TAG_LENGTH }), {
    maxSize: MAX_SOURCE_TAGS,
  }),
  esql: schema.string(),
  slug: schema.string({ maxLength: MAX_SOURCE_SLUG_LENGTH }),
  view_name: schema.string({ maxLength: MAX_SOURCE_VIEW_NAME_LENGTH }),
  enabled: schema.boolean(),
  created_by: schema.string(),
  created_at: schema.string(),
  updated_at: schema.string(),
  // Moves only when the normalized ES|QL changes, so engines can tell a query edit from a
  // title edit without diffing the query themselves.
  esql_updated_at: schema.string(),
});

// Frozen literals: a stored schema must not move when `SOURCE_TYPES` does. The assertion below
// stops compiling when the two lists diverge, so a new type is added here on purpose.
const nightshiftSourceTypeSchema = schema.oneOf([
  schema.literal('logs'),
  schema.literal('metrics'),
  schema.literal('traces'),
  schema.literal('unknown'),
]);

type TSchemaSourceType = TypeOf<typeof nightshiftSourceTypeSchema>;

/** Resolves to `true` only while the schema literals and `SOURCE_TYPES` are the same set. */
export const SOURCE_TYPES_MATCH_SCHEMA: [SourceType] extends [TSchemaSourceType]
  ? [TSchemaSourceType] extends [SourceType]
    ? true
    : never
  : never = true;

const nightshiftSourceAttributesSchemaV2 = nightshiftSourceAttributesSchemaV1.extends({
  // Derived from `esql` on every write. Not mapped: nothing searches or filters on it.
  type: nightshiftSourceTypeSchema,
});

export type NightshiftSourceAttributes = TypeOf<typeof nightshiftSourceAttributesSchemaV2>;

/**
 * Hidden so it stays out of Saved Objects Management. The Nightshift feature grants it:
 * `all` can write, `read` can read. The scoped client still has to name it in
 * `includedHiddenTypes`.
 */
export const nightshiftSourceSavedObjectType: SavedObjectsType<NightshiftSourceAttributes> = {
  name: NIGHTSHIFT_SOURCE_SO_TYPE,
  hidden: true,
  namespaceType: 'single',
  mappings: {
    dynamic: false,
    properties: {
      // keyword rather than text: the list endpoint sorts on it.
      title: { type: 'keyword', ignore_above: 1024 },
      enabled: { type: 'boolean' },
      // Create looks this up in the current space so two sources with the same title do not share a view.
      view_name: { type: 'keyword', ignore_above: 1024 },
      // tags and slug stay in `_source`; list only filters/sorts title and enabled.
    },
  },
  management: {
    importableAndExportable: false,
  },
  modelVersions: {
    1: {
      changes: [],
      schemas: {
        create: nightshiftSourceAttributesSchemaV1,
        forwardCompatibility: nightshiftSourceAttributesSchemaV1.extends(
          {},
          { unknowns: 'ignore' }
        ),
      },
    },
    2: {
      // No backfill: the source catalog starts empty, so no stored document predates `type`.
      changes: [],
      schemas: {
        create: nightshiftSourceAttributesSchemaV2,
        forwardCompatibility: nightshiftSourceAttributesSchemaV2.extends(
          {},
          { unknowns: 'ignore' }
        ),
      },
    },
  },
};
