/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/** A definition that cannot be turned into queries; the message names the rule that failed. */
export class InventoryDefinitionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InventoryDefinitionError';
  }
}
