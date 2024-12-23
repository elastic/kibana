/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export class ErrorWithStatusCode extends Error {
  private readonly statusCode: number;

  constructor(message: string, statusCode: number) {
    super(message);
    this.statusCode = statusCode;

    // For debugging - capture name of subclasses
    this.name = this.constructor.name;
  }

  public getStatusCode = (): number => this.statusCode;
}
