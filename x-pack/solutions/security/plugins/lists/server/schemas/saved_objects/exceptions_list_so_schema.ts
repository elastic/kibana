/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as t from 'io-ts';
import {
  commentsArrayOrUndefined,
  created_at,
  created_by,
  description,
  entriesArrayOrUndefined,
  exceptionListItemType,
  exceptionListType,
  expireTimeOrUndefined,
  immutableOrUndefined,
  itemIdOrUndefined,
  list_id,
  list_type,
  metaOrUndefined,
  name,
  osTypeArray,
  tags,
  tie_breaker_id,
  updated_by,
} from '@kbn/securitysolution-io-ts-list-types';
import { versionOrUndefined } from '@kbn/securitysolution-io-ts-types';

/**
 * Superset saved object of both lists and list items since they share the same saved object type.
 */
export const exceptionListSoSchema = t.exact(
  t.type({
    comments: commentsArrayOrUndefined,
    created_at,
    created_by,
    description,
    entries: entriesArrayOrUndefined,
    expire_time: expireTimeOrUndefined,
    immutable: immutableOrUndefined,
    item_id: itemIdOrUndefined,
    list_id,
    list_type,
    meta: metaOrUndefined,
    name,
    os_types: osTypeArray,
    tags,
    tie_breaker_id,
    type: t.union([exceptionListType, exceptionListItemType]),
    updated_by,
    version: versionOrUndefined,
  })
);

export type ExceptionListSoSchema = t.TypeOf<typeof exceptionListSoSchema>;
