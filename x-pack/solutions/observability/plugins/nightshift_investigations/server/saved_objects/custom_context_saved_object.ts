/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import type { SavedObjectsType } from '@kbn/core/server';
import {
  MAX_CUSTOM_CONTEXT_AUTHOR_NAME_LENGTH,
  MAX_CUSTOM_CONTEXT_SNIPPETS,
  MAX_CUSTOM_CONTEXT_SNIPPET_ID_LENGTH,
  MAX_CUSTOM_CONTEXT_SNIPPET_LENGTH,
  type CustomContextSnippet,
} from '../../common/custom_context';

export const NIGHTSHIFT_CUSTOM_CONTEXT_SO_TYPE = 'nightshift-custom-context';

// A space holds exactly one custom context object, so concurrent first writes collide on the id.
export const NIGHTSHIFT_CUSTOM_CONTEXT_SO_ID = 'custom-context';

export interface NightshiftCustomContextAttributes {
  snippets: CustomContextSnippet[];
}

const nightshiftCustomContextAttributesSchemaV1 = schema.object({
  snippets: schema.arrayOf(
    schema.object({
      id: schema.string({ maxLength: MAX_CUSTOM_CONTEXT_SNIPPET_ID_LENGTH }),
      text: schema.string({ maxLength: MAX_CUSTOM_CONTEXT_SNIPPET_LENGTH }),
      author_name: schema.string({ maxLength: MAX_CUSTOM_CONTEXT_AUTHOR_NAME_LENGTH }),
      created_at: schema.string({ maxLength: 64 }),
      updated_by: schema.maybe(schema.string({ maxLength: MAX_CUSTOM_CONTEXT_AUTHOR_NAME_LENGTH })),
      updated_at: schema.maybe(schema.string({ maxLength: 64 })),
    }),
    { maxSize: MAX_CUSTOM_CONTEXT_SNIPPETS }
  ),
});

export const nightshiftCustomContextSavedObjectType: SavedObjectsType<NightshiftCustomContextAttributes> =
  {
    name: NIGHTSHIFT_CUSTOM_CONTEXT_SO_TYPE,
    hidden: true,
    namespaceType: 'single',
    mappings: {
      dynamic: false,
      properties: {},
    },
    management: {
      importableAndExportable: false,
    },
    modelVersions: {
      1: {
        changes: [],
        schemas: {
          create: nightshiftCustomContextAttributesSchemaV1,
          forwardCompatibility: nightshiftCustomContextAttributesSchemaV1.extends(
            {},
            { unknowns: 'ignore' }
          ),
        },
      },
    },
  };
