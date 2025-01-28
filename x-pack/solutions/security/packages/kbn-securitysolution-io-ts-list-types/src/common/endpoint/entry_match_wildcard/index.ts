/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as t from 'io-ts';
import {
  NonEmptyString,
  operatorExcluded,
  operatorIncluded,
} from '@kbn/securitysolution-io-ts-types';

export const endpointEntryMatchWildcard = t.exact(
  t.type({
    field: NonEmptyString,
    operator: t.union([operatorIncluded, operatorExcluded]),
    type: t.keyof({ wildcard: null }),
    value: NonEmptyString,
  })
);
export type EndpointEntryMatchWildcard = t.TypeOf<typeof endpointEntryMatchWildcard>;
