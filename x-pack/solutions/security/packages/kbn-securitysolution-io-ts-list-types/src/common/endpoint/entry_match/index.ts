/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
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
