/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export class AutomationDailyLimitReachedError extends Error {
  constructor(public readonly limit: number | undefined) {
    super('The automation daily dispatch limit has been reached');
    this.name = 'AutomationDailyLimitReachedError';
  }
}
