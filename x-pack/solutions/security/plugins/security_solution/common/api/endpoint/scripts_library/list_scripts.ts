/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema, type TypeOf } from '@kbn/config-schema';
import { isScriptLibraryKqlFilterValid } from '../../../endpoint/service/script_library/script_library_utils';
import { ENDPOINT_DEFAULT_PAGE_SIZE } from '../../../endpoint/constants';
import type { DeepMutable } from '../../../endpoint/types';

export const ListScriptsRequestSchema = {
  query: schema.maybe(
    schema.object({
      page: schema.maybe(schema.number({ defaultValue: 1, min: 1 })),
      pageSize: schema.maybe(
        schema.number({ defaultValue: ENDPOINT_DEFAULT_PAGE_SIZE, min: 1, max: 1000 })
      ),
      sortField: schema.maybe(
        schema.oneOf([
          schema.literal('name'),
          schema.literal('createdAt'),
          schema.literal('createdBy'),
          schema.literal('updatedAt'),
          schema.literal('updatedBy'),
          schema.literal('fileSize'),
        ])
      ),
      sortDirection: schema.maybe(
        schema.oneOf([schema.literal('asc'), schema.literal('desc')], { defaultValue: 'asc' })
      ),
      kuery: schema.maybe(
        schema.string({
          validate: (value) => isScriptLibraryKqlFilterValid(value).error,
        })
      ),
    })
  ),
};

export type ListScriptsRequestQuery = DeepMutable<TypeOf<typeof ListScriptsRequestSchema.query>>;
