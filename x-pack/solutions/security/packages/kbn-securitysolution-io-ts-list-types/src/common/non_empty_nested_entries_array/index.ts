/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as t from 'io-ts';
import { Either } from 'fp-ts/Either';
import { entriesMatch } from '../entry_match';
import { entriesMatchAny } from '../entry_match_any';
import { entriesExists } from '../entries_exist';

export const nestedEntryItem = t.union([entriesMatch, entriesMatchAny, entriesExists]);
export const nestedEntriesArray = t.array(nestedEntryItem);
export type NestedEntriesArray = t.TypeOf<typeof nestedEntriesArray>;

/**
 * Types the nonEmptyNestedEntriesArray as:
 *   - An array of entries of length 1 or greater
 *
 */
export const nonEmptyNestedEntriesArray = new t.Type<
  NestedEntriesArray,
  NestedEntriesArray,
  unknown
>(
  'NonEmptyNestedEntriesArray',
  nestedEntriesArray.is,
  (input, context): Either<t.Errors, NestedEntriesArray> => {
    if (Array.isArray(input) && input.length === 0) {
      return t.failure(input, context);
    } else {
      return nestedEntriesArray.validate(input, context);
    }
  },
  t.identity
);

export type NonEmptyNestedEntriesArray = t.OutputOf<typeof nonEmptyNestedEntriesArray>;
export type NonEmptyNestedEntriesArrayDecoded = t.TypeOf<typeof nonEmptyNestedEntriesArray>;
