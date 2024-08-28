/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Effect, Context } from 'effect';
// Create a tag for the 'Random' service
class Random extends Context.Tag('MyRandomService')<
  Random,
  {
    readonly next: Effect.Effect<number>;
  }
>() {}
// Create a tag for the 'Logger' service
class Logger extends Context.Tag('MyLoggerService')<
  Logger,
  {
    readonly log: (message: string) => Effect.Effect<void>;
  }
>() {}
const program =
  // Acquire instances of the 'Random' and 'Logger' services
  Effect.all([Random, Logger]).pipe(
    Effect.andThen(([random, logger]) =>
      // Generate a random number using the 'Random' service
      random.next.pipe(
        Effect.andThen((randomNumber) =>
          // Log the random number using the 'Logger' service
          logger.log(String(randomNumber))
        )
      )
    )
  );
// Provide service implementations for 'Random' and 'Logger'
const runnable1 = program.pipe(
  Effect.provideService(Random, {
    next: Effect.sync(() => Math.random()),
  }),
  Effect.provideService(Logger, {
    log: (message) => Effect.sync(() => console.log(message)),
  })
);
Effect.runSync(runnable1);
