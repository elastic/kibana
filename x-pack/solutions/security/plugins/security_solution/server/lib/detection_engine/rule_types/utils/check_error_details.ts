/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { KbnSearchError } from '@kbn/data-plugin/server/search/report_search_error';

const USER_ERRORS_EXCEPTIONS = [
  'index_not_found_exception',
  'status_exception',
  'verification_exception',
  'parsing_exception',
  'x_content_parse_exception',
  'number_format_exception',
  // Raised when the rule owner's credentials are not authorized for the search, e.g. a missing
  // `read` index privilege or a cross-project search linked project that rejects the request.
  'security_exception',
];

// illegal_argument_exception and query_shard_exception are too broad to classify as user
// errors globally (ES itself can produce them from framework-generated queries). These reason
// substrings identify cases that ES only produces when evaluating user-supplied query text
// against the target field mapping, and they arrive wrapped in different exception types
// depending on the search path (an illegal_argument_exception caused_by on a shard failure, or
// a query_shard_exception root cause of a search_phase_execution_exception), so they are
// matched regardless of the wrapper. When adding a new substring, verify that
// framework-generated queries cannot emit it before landing.
const USER_ERROR_REASON_SUBSTRINGS = [
  'is not an IP string literal',
  'Can only use prefix queries on keyword, text and wildcard fields',
];

// Fielddata errors can also be emitted for framework-generated aggregations and sorts, so they
// are only classified as user errors when accompanied by illegal_argument_exception, which is
// how the known user-driven variants have been observed to arrive in shard failures.
const isFielddataUserError = (errorString: string): boolean =>
  errorString.includes('illegal_argument_exception') &&
  errorString.includes('Fielddata is disabled on');

const isUserErrorReason = (errorString: string): boolean =>
  USER_ERROR_REASON_SUBSTRINGS.some((reason) => errorString.includes(reason)) ||
  isFielddataUserError(errorString);

/**
 *
 * @param error
 * @returns
 */
export const isMlJobMissingError = (error: unknown): boolean => {
  /*
  This is the logic I pulled directly from the ML rule type.
  I am also checking length here because the message returned
  from ES for a missing ML job is seemingly always <job name> missing.
  So to ensure we are not checking "missing" as a user error for other
  possible error messages, I added this check.
  */
  return typeof error === 'string' && error.endsWith('missing') && error.split(' ').length === 2;
};

/**
 * if error can be qualified as user error(configurational), returns isUserError: true
 * user errors are excluded from SLO dashboards
 */
export const checkErrorDetails = (error: unknown): { isUserError: boolean } => {
  const errorType = (error as KbnSearchError)?.errBody?.error?.type;
  if (USER_ERRORS_EXCEPTIONS.includes(errorType)) {
    return { isUserError: true };
  }

  if (
    (error instanceof Error &&
      typeof error.message === 'string' &&
      (error.message as string).endsWith('missing')) ||
    isMlJobMissingError(error)
  ) {
    return { isUserError: true };
  }

  const isUserError =
    (error instanceof Error &&
      USER_ERRORS_EXCEPTIONS.some((exception) => error.message.includes(exception))) ||
    (typeof error === 'string' &&
      USER_ERRORS_EXCEPTIONS.some((exception) => error.includes(exception))) ||
    (error instanceof Error && isUserErrorReason(error.message)) ||
    (typeof error === 'string' && isUserErrorReason(error));

  return { isUserError };
};
