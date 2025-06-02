/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ZodError, ZodType } from '@kbn/zod';
import { stringifyZodError } from '@kbn/zod-helpers';
import { type Either, fold, left, right } from 'fp-ts/Either';
import { identity } from 'fp-ts/function';
import { pipe } from 'fp-ts/pipeable';

type ErrorFactory = (message: string) => Error;

const throwErrors = (createError: ErrorFactory) => (errors: ZodError) => {
  throw createError(stringifyZodError(errors));
};

const parseRuntimeType =
  <T>(zodType: ZodType<T>) =>
  (v: unknown): Either<ZodError<T>, T> => {
    const result = zodType.safeParse(v);
    return result.success ? right(result.data) : left(result.error);
  };

export const parseOrThrowErrorFactory =
  (createError: ErrorFactory) => (runtimeType: ZodType) => (inputValue: unknown) =>
    pipe(parseRuntimeType(runtimeType)(inputValue), fold(throwErrors(createError), identity));
