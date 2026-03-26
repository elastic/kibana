/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EndpointError } from '../../../common/endpoint/errors';

export class EndpointIntegrationFleetError extends EndpointError {
  constructor(
    message: string,
    public readonly statusCode: number = 400,
    public readonly apiPassThrough: boolean = true,
    meta: unknown = undefined
  ) {
    super(message, meta);
  }
}
