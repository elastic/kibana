/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/** Signals that the repository already has a running extraction that a new run would prune against. */
export class ExtractionAlreadyRunningError extends Error {
  public constructor(repository: string) {
    super(`An extraction for ${repository} is already running.`);
    this.name = 'ExtractionAlreadyRunningError';
  }
}
