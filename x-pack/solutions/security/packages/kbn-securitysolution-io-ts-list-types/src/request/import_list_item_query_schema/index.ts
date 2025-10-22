/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as t from 'io-ts';

import type { RequiredKeepUndefined } from '../../common/required_keep_undefined';
import { deserializer } from '../../common/deserializer';
import { list_id } from '../../common/list_id';
import { type } from '../../common/type';
import { serializer } from '../../common/serializer';
import { refreshWithWaitFor } from '../../common/refresh';

export const importListItemQuerySchema = t.exact(
  t.partial({ deserializer, list_id, serializer, type, refresh: refreshWithWaitFor })
);

export type ImportListItemQuerySchema = RequiredKeepUndefined<
  t.TypeOf<typeof importListItemQuerySchema>
>;
export type ImportListItemQuerySchemaEncoded = t.OutputOf<typeof importListItemQuerySchema>;
