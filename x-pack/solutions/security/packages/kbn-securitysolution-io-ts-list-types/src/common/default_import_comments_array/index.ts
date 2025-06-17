/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as t from 'io-ts';
import { Either } from 'fp-ts/Either';
import { importComment, ImportCommentsArray } from '../import_comment';

/**
 * Types the DefaultImportCommentsArray as:
 *   - If null or undefined, then a default array of type ImportCommentsArray will be set
 */
export const DefaultImportCommentsArray = new t.Type<
  ImportCommentsArray,
  ImportCommentsArray,
  unknown
>(
  'DefaultImportComments',
  t.array(importComment).is,
  (input, context): Either<t.Errors, ImportCommentsArray> =>
    input == null ? t.success([]) : t.array(importComment).validate(input, context),
  t.identity
);
