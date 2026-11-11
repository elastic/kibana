/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/** The definition of the type a request names cannot be turned into queries; routes answer 400. */
export class InventoryTypeDefinitionError extends Error {
  readonly statusCode = 400;

  constructor(type: string, reason: string) {
    super(`Entity type "${type}" cannot be queried: ${reason}`);
    this.name = 'InventoryTypeDefinitionError';
  }
}
