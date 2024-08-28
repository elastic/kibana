/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Effect, Context, Layer } from 'effect';

class A extends Context.Tag('A')<A, { readonly a: number }>() {}

const a = Layer.effect(
  A,
  Effect.succeed({ a: 5 }).pipe(
    Effect.tap(() => Effect.log('### initialized local provision example'))
  )
);

const program = Effect.gen(function* () {
  // both of these provide svcs locally
  yield* Effect.provide(A, a);
  yield* Effect.provide(A, a);
});

Effect.runPromise(program);
