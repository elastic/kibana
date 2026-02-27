/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export class EntityNotAliasError extends Error {
  constructor(entityIds: string[]) {
    super(
      `Entities [${entityIds.join(
        ', '
      )}] are not aliases (no resolved_to set). Only aliases can be unlinked.`
    );
    this.name = 'EntityNotAliasError';
  }
}
