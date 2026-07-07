/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* eslint-disable max-classes-per-file */

import { i18n } from '@kbn/i18n';
import { EndpointError } from '../../common/endpoint/errors';

export const ENDPOINT_AUTHZ_ERROR_MESSAGE = i18n.translate(
  'xpack.securitySolution.errors.noEndpointAuthzApiErrorMessage',
  { defaultMessage: 'Endpoint authorization failure' }
);

export class NotFoundError extends EndpointError {}

export class EndpointAppContentServicesNotSetUpError extends EndpointError {
  constructor() {
    super('EndpointAppContextService has not been set up (EndpointAppContextService.setup())');
  }
}

export class EndpointAppContentServicesNotStartedError extends EndpointError {
  constructor() {
    super('EndpointAppContextService has not been started (EndpointAppContextService.start())');
  }
}

export class EndpointAuthorizationError extends EndpointError {
  constructor(meta?: unknown) {
    super(ENDPOINT_AUTHZ_ERROR_MESSAGE, meta);
  }
}

export class EndpointHttpError extends EndpointError {
  constructor(
    message: string,
    public readonly statusCode: number = 500,
    public readonly meta?: unknown
  ) {
    super(message, meta);
  }
}
