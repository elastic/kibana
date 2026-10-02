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
  InvestigationNotFoundError,
  InvestigationQuotaDeniedError,
  InvestigationUnavailableError,
  InvalidInvestigationContextError,
} from '../client/errors';

/**
 * Errors agentic investigations throws in-process: a caller without the investigations
 * privileges, an input it rejects, and a write that lost a concurrent update. Only their types are
 * part of that plugin's contract, so they are recognised by name.
 */
const AGENTIC_INVESTIGATIONS_ERRORS = {
  InvestigationsForbiddenError: forbidden,
  InvestigationAttachmentInvalidRequestError: badRequest,
  InvestigationAttachmentConflictError: conflict,
} as const;

const isAgenticInvestigationsError = (
  error: unknown
): error is Error & { name: keyof typeof AGENTIC_INVESTIGATIONS_ERRORS } =>
  error instanceof Error && Object.hasOwn(AGENTIC_INVESTIGATIONS_ERRORS, error.name);

export function rethrowInvestigationClientError(error: unknown): never {
  if (
    error instanceof NightshiftModelNotFoundError ||
    error instanceof NightshiftModelBlockedError
  ) {
    throw badRequest(error.message);
  }
  if (isAgenticInvestigationsError(error)) {
    throw AGENTIC_INVESTIGATIONS_ERRORS[error.name](error.message);
  }
  if (error instanceof InvestigationNotFoundError) {
    throw notFound(error.message);
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
