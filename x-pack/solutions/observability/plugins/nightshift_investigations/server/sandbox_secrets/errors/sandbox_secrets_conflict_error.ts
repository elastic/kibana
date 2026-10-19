/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export class SandboxSecretsConflictError extends Error {
  constructor() {
    super('Sandbox secrets were modified by someone else. Reload and try again.');
    this.name = 'SandboxSecretsConflictError';
  }
}
