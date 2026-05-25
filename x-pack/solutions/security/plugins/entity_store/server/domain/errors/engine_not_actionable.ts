/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export class EngineNotActionableError extends Error {
  constructor(engines: Array<{ type: string; status: string }>) {
    super(
      `Engine is in a non-actionable state: ${engines
        .map((e) => `${e.type} (${e.status})`)
        .join(', ')}`
    );
    this.name = 'EngineNotActionableError';
  }
}
