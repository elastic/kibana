/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as t from 'io-ts';

import { page } from '../../common/page';
import { per_page } from '../../common/per_page';
import { pitId } from '../../common/pit';
import { total } from '../../common/total';
import { exceptionListItemSchema } from '../exception_list_item_schema';

export const foundExceptionListItemSchema = t.intersection([
  t.exact(
    t.type({
      data: t.array(exceptionListItemSchema),
      page,
      per_page,
      total,
    })
  ),
  t.exact(
    t.partial({
      pit: pitId,
    })
  ),
]);

export type FoundExceptionListItemSchema = t.TypeOf<typeof foundExceptionListItemSchema>;
