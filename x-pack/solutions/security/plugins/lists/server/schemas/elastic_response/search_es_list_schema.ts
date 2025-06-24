/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as t from 'io-ts';
import {
  created_at,
  created_by,
  description,
  deserializerOrUndefined,
  immutable,
  name,
  nullableMetaOrUndefined,
  serializerOrUndefined,
  tie_breaker_id,
  timestampFromEsResponse,
  type,
  updated_at,
  updated_by,
} from '@kbn/securitysolution-io-ts-list-types';
import { version } from '@kbn/securitysolution-io-ts-types';

export const searchEsListSchema = t.exact(
  t.type({
    '@timestamp': timestampFromEsResponse,
    created_at,
    created_by,
    description,
    deserializer: deserializerOrUndefined,
    immutable,
    meta: nullableMetaOrUndefined,
    name,
    serializer: serializerOrUndefined,
    tie_breaker_id,
    type,
    updated_at,
    updated_by,
    version,
  })
);

export type SearchEsListSchema = t.TypeOf<typeof searchEsListSchema>;
