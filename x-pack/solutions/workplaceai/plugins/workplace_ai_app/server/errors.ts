/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export class WorkplaceAIError extends Error {
  constructor(message: string, public readonly statusCode = 500) {
    super(message);
  }
}

export const isWorkplaceAIError = (err: unknown): err is WorkplaceAIError => {
  return err instanceof WorkplaceAIError;
};
