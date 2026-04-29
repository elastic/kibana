/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as t from 'io-ts';

import { listSchema } from '../list_schema';
import { cursor } from '../../common/cursor';
import { page } from '../../common/page';
import { per_page } from '../../common/per_page';
import { total } from '../../common/total';

export const foundListSchema = t.exact(
  t.type({
    cursor,
    data: t.array(listSchema),
    page,
    per_page,
    total,
  })
);

export type FoundListSchema = t.TypeOf<typeof foundListSchema>;
