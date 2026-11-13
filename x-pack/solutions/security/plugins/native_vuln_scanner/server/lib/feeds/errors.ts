/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * A definition's criteria cannot be turned into "installed < fixed" rows: `negated` criteria
 * would need absence facts, `too_complex` ones expand past the parser's limit.
 */
export class UnsupportedCriteriaError extends Error {
  constructor(public readonly reason: 'negated' | 'too_complex', message?: string) {
    super(message ?? `unsupported OVAL criteria: ${reason}`);
  }
}
