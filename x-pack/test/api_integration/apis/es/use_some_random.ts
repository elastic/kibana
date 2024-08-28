/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Effect, Context, Console } from 'effect';

class Random extends Context.Tag('SomeRandomService')<
  Random,
  { readonly next: Effect.Effect<number> }
>() {}

const program = Random.pipe(
  Effect.andThen((random) => random.next),
  Effect.andThen((randomNumber) => Console.log(`random number: ${randomNumber}`))
);

const runnable = Effect.provideService(program, Random, {
  next: Effect.sync(() => Math.random()),
});
Effect.runPromise(runnable);
