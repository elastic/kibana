/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/** The requested type has no registered definition with a `dynamic` block; routes answer 404. */
export class InventoryTypeNotFoundError extends Error {
  readonly statusCode = 404;

  constructor(type: string, reason?: string) {
    super(
      `Entity type "${type}" is not available in the entity inventory${reason ? `: ${reason}` : ''}`
    );
    this.name = 'InventoryTypeNotFoundError';
  }
}
