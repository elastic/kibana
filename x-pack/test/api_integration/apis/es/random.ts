/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Effect, Context } from 'effect';
// Create a tag for the 'Random' service
export class Random extends Context.Tag('MyRandomService')<
  Random,
  {
    readonly next: Effect.Effect<number>;
  }
>() {}
