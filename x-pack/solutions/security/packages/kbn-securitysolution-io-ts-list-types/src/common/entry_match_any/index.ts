/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as t from 'io-ts';

import { NonEmptyString, nonEmptyOrNullableStringArray } from '@kbn/securitysolution-io-ts-types';
import { listOperator as operator } from '../list_operator';
import { columnType } from '../column_type';

export const entriesMatchAny = t.exact(
  t.intersection([
    t.type({
      field: NonEmptyString,
      operator,
      type: t.keyof({ match_any: null }),
      value: nonEmptyOrNullableStringArray,
    }),
    t.partial({ column_type: columnType }),
  ])
);
export type EntryMatchAny = t.TypeOf<typeof entriesMatchAny>;
