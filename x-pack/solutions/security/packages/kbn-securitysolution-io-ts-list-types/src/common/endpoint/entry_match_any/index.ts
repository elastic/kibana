/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as t from 'io-ts';
import {
  NonEmptyString,
  nonEmptyOrNullableStringArray,
  operatorIncluded,
} from '@kbn/securitysolution-io-ts-types';

export const endpointEntryMatchAny = t.exact(
  t.type({
    field: NonEmptyString,
    operator: operatorIncluded,
    type: t.keyof({ match_any: null }),
    value: nonEmptyOrNullableStringArray,
  })
);
export type EndpointEntryMatchAny = t.TypeOf<typeof endpointEntryMatchAny>;
