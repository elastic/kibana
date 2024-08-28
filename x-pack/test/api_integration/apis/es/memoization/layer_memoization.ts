/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// eslint-disable-next-line max-classes-per-file
import { Effect, Context, Layer } from 'effect';
class A extends Context.Tag('A')<A, { readonly a: number }>() {}

class B extends Context.Tag('B')<B, { readonly b: string }>() {}

class C extends Context.Tag('C')<C, { readonly c: boolean }>() {}

const a = Layer.effect(
  A,
  Effect.succeed({ a: 5 }).pipe(
    Effect.tap(() => Effect.log('### initialized global provision example'))
  )
);

const b = Layer.effect(
  B,
  Effect.gen(function* () {
    // eslint-disable-next-line @typescript-eslint/no-shadow
    const { a } = yield* A;
    return { b: String(a) };
  })
);

const c = Layer.effect(
  C,
  Effect.gen(function* () {
    // eslint-disable-next-line @typescript-eslint/no-shadow
    const { a } = yield* A;
    return { c: a > 0 };
  })
);

const program = Effect.gen(function* () {
  yield* B;
  yield* C;
});

const runnable = Effect.provide(
  program,
  // This is svc provision "globally"
  Layer.merge(Layer.provide(b, a), Layer.provide(c, a))
);

Effect.runPromise(runnable);
