/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as t from 'io-ts';
import { NonEmptyString, operatorIncluded } from '@kbn/securitysolution-io-ts-types';

export const endpointEntryMatch = t.exact(
  t.type({
    field: NonEmptyString,
    operator: operatorIncluded,
    type: t.keyof({ match: null }),
    value: NonEmptyString,
  })
);
export type EndpointEntryMatch = t.TypeOf<typeof endpointEntryMatch>;
