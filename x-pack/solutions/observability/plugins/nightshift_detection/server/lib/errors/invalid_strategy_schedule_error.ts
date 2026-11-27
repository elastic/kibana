/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/** A strategy's cadence or settle time cannot be planned: a window needs whole, positive minutes. */
export class InvalidStrategyScheduleError extends Error {
  constructor(public readonly strategyId: string) {
    super(
      `Detection strategy [${strategyId}] needs a cadence of whole minutes of at least 1 and a settle time of whole minutes of at least 0`
    );
    this.name = 'InvalidStrategyScheduleError';
  }
}
