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

// A rule run that exceeds its timeout is almost always caused by the rule's own workload (an
// expensive query, a large time range, a cluster too small for the rule schedule), which the rule
// owner can fix and Kibana cannot. These messages identify an Elasticsearch request from the rule
// executor that did not complete before the rule timed out, so they are classified as user errors.
//
// The abort messages are produced by the Alerting Framework's scoped cluster client wrappers
// (x-pack/platform/plugins/shared/alerting/server/lib/wrap_scoped_cluster_client.ts and
// wrap_search_source_client.ts) when Task Manager cancels the run while a request is in flight.
// They are plain strings there rather than exported constants, so the tests in
// check_error_details.test.ts pin the exact text and will fail if the framework changes it.
//
// `Request timed out` is the Elasticsearch client's TimeoutError. The rule's scoped cluster client
// uses the rule timeout as its request timeout, so this fires when a rule search outlives the rule
// timeout before Task Manager cancels the run. The executors log it both with a prefix
// (esql/esql_request.ts, utils/single_search_after.ts) and bare (the message returned to
// create_security_rule_type_wrapper.ts), and the run is only a user error if every entry is, so the
// bare text has to match. Other clients used during a run (e.g. the rule registry client writing
// alerts) can emit the same text on the global `elasticsearch.requestTimeout`; those cases are
// accepted as user errors here and left to the cross-project user error spike monitoring.
const TIMEOUT_REASON_SUBSTRINGS = [
  // wrap_scoped_cluster_client.ts, esql / eql / search wrappers
  'ES|QL search has been aborted due to cancelled execution',
  'EQL search has been aborted due to cancelled execution',
  'Search has been aborted due to cancelled execution',
  // esql/esql_request.ts, executor noticed the cancellation between two poll requests
  'Rule execution cancelled due to timeout',
  // ES client TimeoutError, raised when a rule search outlives the rule timeout
  'Request timed out',
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
  ...TIMEOUT_REASON_SUBSTRINGS,
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
