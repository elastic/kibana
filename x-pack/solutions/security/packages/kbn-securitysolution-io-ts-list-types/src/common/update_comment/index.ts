/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import * as t from 'io-ts';
import { NonEmptyString } from '@kbn/securitysolution-io-ts-types';
import { id } from '../id';

export const updateComment = t.intersection([
  t.exact(
    t.type({
      comment: NonEmptyString,
    })
  ),
  t.exact(
    t.partial({
      id,
    })
  ),
]);

export type UpdateComment = t.TypeOf<typeof updateComment>;
export const updateCommentsArray = t.array(updateComment);
export type UpdateCommentsArray = t.TypeOf<typeof updateCommentsArray>;
export const updateCommentsArrayOrUndefined = t.union([updateCommentsArray, t.undefined]);
export type UpdateCommentsArrayOrUndefined = t.TypeOf<typeof updateCommentsArrayOrUndefined>;
