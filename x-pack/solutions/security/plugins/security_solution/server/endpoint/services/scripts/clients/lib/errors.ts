/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* eslint-disable max-classes-per-file */

import type { ResponseActionAgentType } from '../../../../../../common/endpoint/service/response_actions/constants';
import { CustomHttpRequestError } from '../../../../../utils/custom_http_request_error';
import { stringify } from '../../../../utils/stringify';

/**
 * Errors associated with Agent Status clients
 */
export class CustomScriptsClientError extends CustomHttpRequestError {
  toJSON() {
    return {
      message: this.message,
      statusCode: this.statusCode,
      meta: this.meta,
      stack: this.stack,
    };
  }

  toString() {
    return stringify(this.toJSON());
  }
}

export class UnsupportedAgentTypeError extends CustomScriptsClientError {
  constructor(message: string, statusCode = 501, meta?: unknown) {
    super(message, statusCode, meta);
  }
}

export class CustomScriptsNotSupportedError extends CustomScriptsClientError {
  constructor(
    agentIds: string[],
    agentType: ResponseActionAgentType,
    statusCode: number = 405,
    meta?: unknown
  ) {
    super(
      `Customs scripts are not available for ${`[agentIds: ${agentIds} and agentType: ${agentType}]`} not supported`,
      statusCode,
      meta
    );
  }
}
