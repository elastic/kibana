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

export const namespaceType = t.keyof({ agnostic: null, single: null });
export type NamespaceType = t.TypeOf<typeof namespaceType>;

/**
 * Types the DefaultNamespace as:
 *   - If null or undefined, then a default string/enumeration of "single" will be used.
 */
export const DefaultNamespace = new t.Type<NamespaceType, NamespaceType | undefined, unknown>(
  'DefaultNamespace',
  namespaceType.is,
  (input, context): Either<t.Errors, NamespaceType> =>
    input == null ? t.success('single') : namespaceType.validate(input, context),
  t.identity
);
