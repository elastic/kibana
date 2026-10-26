/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ValidationIssue } from '../common/flag_validation';

type ErrorStatusCode = 400 | 404 | 409;

/** A domain error that the routes return with its status code instead of a 500. */
export class FeatureFlagsError extends Error {
  constructor(
    public readonly statusCode: ErrorStatusCode,
    message: string,
    public readonly issues?: ValidationIssue[]
  ) {
    super(message);
    this.name = 'FeatureFlagsError';
  }
}

export const notFoundError = (message: string) => new FeatureFlagsError(404, message);

/** The object already exists, changed since it was read, or is still referenced. */
export const conflictError = (message: string) => new FeatureFlagsError(409, message);

export const validationError = (message: string, issues: ValidationIssue[] = []) =>
  new FeatureFlagsError(
    400,
    issues.length
      ? `${message}\n${issues.map(({ path, message: issue }) => `- ${path}: ${issue}`).join('\n')}`
      : message,
    issues
  );
