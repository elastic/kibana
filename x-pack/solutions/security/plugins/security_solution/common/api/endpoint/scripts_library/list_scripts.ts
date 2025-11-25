/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema, type TypeOf } from '@kbn/config-schema';
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
          schema.literal('updatedAt'),
          schema.literal('createdAt'),
        ])
      ),
      sortDirection: schema.maybe(schema.oneOf([schema.literal('asc'), schema.literal('desc')])),

      // TODO:PT add filters or perhaps support for `kuery`
    })
  ),
};

export type ListScriptsRequestQuery = DeepMutable<TypeOf<typeof ListScriptsRequestSchema.query>>;
