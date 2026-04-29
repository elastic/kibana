/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export interface Validation {
  valid: boolean;
  message: string | undefined;
}

export class HttpAuthzError extends Error {
  public readonly statusCode: number;

  constructor(message: string | undefined) {
    super(message);
    this.name = 'HttpAuthzError';
    this.statusCode = 403;
  }
}

export const toAuthzError = (validation: Validation): HttpAuthzError | undefined => {
  if (!validation.valid) {
    return new HttpAuthzError(validation.message);
  }
};

export const throwAuthzError = (validation: Validation): void => {
  const error = toAuthzError(validation);
  if (error) {
    throw error;
  }
};
