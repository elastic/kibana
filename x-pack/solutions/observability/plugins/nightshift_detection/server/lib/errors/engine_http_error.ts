/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * A failure the caller can act on, with the HTTP status the route answers with. Routes turn it
 * into a response at the edge; services throw it and never build responses.
 */
export class EngineHttpError extends Error {
  constructor(message: string, public readonly statusCode: number) {
    super(message);
    this.name = 'EngineHttpError';
  }
}
