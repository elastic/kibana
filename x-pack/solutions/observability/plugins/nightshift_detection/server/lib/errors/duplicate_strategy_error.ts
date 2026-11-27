/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/** Two detection strategies are bound with the same descriptor id. */
export class DuplicateStrategyError extends Error {
  constructor(public readonly strategyId: string) {
    super(`Detection strategy [${strategyId}] is bound more than once`);
    this.name = 'DuplicateStrategyError';
  }
}
