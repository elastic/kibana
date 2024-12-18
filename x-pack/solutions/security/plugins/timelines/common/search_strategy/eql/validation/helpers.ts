/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { get, has } from 'lodash';

const PARSING_ERROR_TYPE = 'parsing_exception';
const VERIFICATION_ERROR_TYPE = 'verification_exception';
const MAPPING_ERROR_TYPE = 'mapping_exception';

interface ErrorCause {
  type: string;
  reason: string;
}

export interface ErrorResponse {
  error: ErrorCause & { root_cause: ErrorCause[] };
}

const isValidationErrorType = (type: unknown): boolean =>
  type === PARSING_ERROR_TYPE || type === VERIFICATION_ERROR_TYPE || type === MAPPING_ERROR_TYPE;

export const isErrorResponse = (response: unknown): response is ErrorResponse =>
  has(response, 'error.type');

export const isValidationErrorResponse = (response: unknown): response is ErrorResponse =>
  isErrorResponse(response) && isValidationErrorType(get(response, 'error.type'));

export const getValidationErrors = (response: ErrorResponse): string[] =>
  response.error.root_cause
    .filter((cause) => isValidationErrorType(cause.type))
    .map((cause) => cause.reason);
