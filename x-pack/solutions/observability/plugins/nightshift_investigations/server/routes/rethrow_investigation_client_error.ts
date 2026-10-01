/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  badRequest,
  conflict,
  forbidden,
  notFound,
  serverUnavailable,
  tooManyRequests,
} from '@hapi/boom';
import {
  NightshiftModelBlockedError,
  NightshiftModelNotFoundError,
} from '@kbn/significant-events-schema';
import {
  InvestigationConflictError,
  InvestigationNotFoundError,
  InvestigationMetadataMissingError,
  InvestigationQuotaDeniedError,
  InvestigationUnavailableError,
  InvalidInvestigationContextError,
} from '../client/errors';

/**
 * Agentic investigations rejects a caller without the investigations privileges with this error.
 * Only its type is part of that plugin's contract, so it is recognised by name.
 */
const INVESTIGATIONS_FORBIDDEN_ERROR_NAME = 'InvestigationsForbiddenError';

export function rethrowInvestigationClientError(error: unknown): never {
  if (
    error instanceof NightshiftModelNotFoundError ||
    error instanceof NightshiftModelBlockedError
  ) {
    throw badRequest(error.message);
  }
  if (error instanceof Error && error.name === INVESTIGATIONS_FORBIDDEN_ERROR_NAME) {
    throw forbidden(error.message);
  }
  if (error instanceof InvestigationNotFoundError) {
    throw notFound(error.message);
  }
  if (error instanceof InvestigationMetadataMissingError) {
    throw badRequest(error.message);
  }
  if (error instanceof InvestigationConflictError) {
    throw conflict(error.message);
  }
  if (error instanceof InvestigationQuotaDeniedError) {
    throw tooManyRequests(error.message);
  }
  if (error instanceof InvalidInvestigationContextError) {
    throw badRequest(error.message);
  }
  if (error instanceof InvestigationUnavailableError) {
    throw serverUnavailable(error.message);
  }
  throw error;
}
