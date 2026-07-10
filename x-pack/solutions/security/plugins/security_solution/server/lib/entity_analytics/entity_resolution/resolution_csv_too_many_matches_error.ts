/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export class ResolutionCsvTooManyMatchesError extends Error {
  constructor(maxMatchedEntities: number) {
    super(
      `Matched more than ${maxMatchedEntities} entities. Narrow your identifying fields to be more specific.`
    );
    this.name = 'ResolutionCsvTooManyMatchesError';
  }
}
