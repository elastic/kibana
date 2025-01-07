/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as t from 'io-ts';
import { either } from 'fp-ts/lib/Either';
import type { Either } from 'fp-ts/lib/Either';

export type StringToNonNegativeNumber = t.Type<number, string, unknown>;

/**
 * Types the StringToNonNegativeNumber as:
 *   - If a string this converts the string into a number
 *   - Ensures it is a number (and not NaN)
 *   - Ensures it is non-negative (>= 0) number
 */

export const StringToNonNegativeNumber: StringToNonNegativeNumber = new t.Type<
  number,
  string,
  unknown
>(
  'StringToNonNegativeNumber',
  t.number.is,
  (input, context): Either<t.Errors, number> => {
    return either.chain(
      t.string.validate(input, context),
      (numberAsString): Either<t.Errors, number> => {
        const stringAsNumber = +numberAsString;
        if (numberAsString.trim().length === 0 || isNaN(stringAsNumber) || stringAsNumber < 0) {
          return t.failure(input, context);
        } else {
          return t.success(stringAsNumber);
        }
      }
    );
  },
  String
);
