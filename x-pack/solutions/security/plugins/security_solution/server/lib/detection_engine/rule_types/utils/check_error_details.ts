/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { KbnSearchError } from '@kbn/data-plugin/server/search/report_search_error';

const USER_ERRORS_EXCEPTIONS = [
  'status_exception',
  'verification_exception',
  'parsing_exception',
  // Raised when the rule owner's credentials are not authorized for the search, e.g. a missing
  // `read` index privilege or a cross-project search linked project that rejects the request.
  'security_exception',
];

// illegal_argument_exception is too broad to classify as a user error globally (ES itself
// can produce it from framework-generated queries). These reason substrings identify cases
// that are unambiguously caused by user data or configuration.
const ILLEGAL_ARGUMENT_USER_REASON_SUBSTRINGS = [
  'is not an IP string literal',
  'Fielddata is disabled on',
];

const isIllegalArgumentUserError = (errorString: string): boolean =>
  errorString.includes('illegal_argument_exception') &&
  ILLEGAL_ARGUMENT_USER_REASON_SUBSTRINGS.some((reason) => errorString.includes(reason));

/**
 * if error can be qualified as user error(configurational), returns isUserError: true
 * user errors are excluded from SLO dashboards
 */
export const checkErrorDetails = (error: unknown): { isUserError: boolean } => {
  const errorType = (error as KbnSearchError)?.errBody?.error?.type;
  if (USER_ERRORS_EXCEPTIONS.includes(errorType)) {
    return { isUserError: true };
  }

  const isUserError =
    (error instanceof Error &&
      USER_ERRORS_EXCEPTIONS.some((exception) => error.message.includes(exception))) ||
    (typeof error === 'string' &&
      USER_ERRORS_EXCEPTIONS.some((exception) => error.includes(exception))) ||
    (error instanceof Error && isIllegalArgumentUserError(error.message)) ||
    (typeof error === 'string' && isIllegalArgumentUserError(error));

  return { isUserError };
};
