/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import * as t from 'io-ts';
import { Either } from 'fp-ts/lib/Either';
import { list, ListArray } from '../lists';

/**
 * Types the DefaultListArray as:
 *   - If null or undefined, then a default array of type list will be set
 */
export const DefaultListArray = new t.Type<ListArray, ListArray | undefined, unknown>(
  'DefaultListArray',
  t.array(list).is,
  (input, context): Either<t.Errors, ListArray> =>
    input == null ? t.success([]) : t.array(list).validate(input, context),
  t.identity
);
