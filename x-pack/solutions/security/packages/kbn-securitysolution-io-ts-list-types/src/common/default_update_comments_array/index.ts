/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as t from 'io-ts';
import type { Either } from 'fp-ts/Either';
import type { UpdateCommentsArray } from '../update_comment';
import { updateCommentsArray } from '../update_comment';

/**
 * Types the DefaultUpdateComments as:
 *   - If null or undefined, then a default array of type UpdateCommentsArray will be set
 */
export const DefaultUpdateCommentsArray = new t.Type<
  UpdateCommentsArray,
  UpdateCommentsArray,
  unknown
>(
  'DefaultUpdateComments',
  updateCommentsArray.is,
  (input, context): Either<t.Errors, UpdateCommentsArray> =>
    input == null ? t.success([]) : updateCommentsArray.validate(input, context),
  t.identity
);
