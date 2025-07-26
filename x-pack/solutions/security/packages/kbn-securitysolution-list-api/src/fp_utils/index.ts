/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { pipe } from 'fp-ts/pipeable';
import { TaskEither } from 'fp-ts/TaskEither';
import { fold } from 'fp-ts/Either';

// TODO: This is copied in a few other spots and probably should live within its own kbn package
// rather than living here. A package such as kbn-security-solution-fp-utils
export const toPromise = async <E, A>(taskEither: TaskEither<E, A>): Promise<A> =>
  pipe(
    await taskEither(),
    fold(
      (e) => Promise.reject(e),
      (a) => Promise.resolve(a)
    )
  );

export const toError = (e: unknown): Error => (e instanceof Error ? e : new Error(String(e)));
