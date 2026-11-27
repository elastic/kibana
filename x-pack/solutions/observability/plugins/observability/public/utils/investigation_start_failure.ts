/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import {
  isHttpFetchError,
  type IHttpFetchError,
  type ResponseErrorBody,
} from '@kbn/core-http-browser';
import {
  isInvestigationQuotaReached,
  type InvestigationQuotasResponse,
} from '@kbn/nightshift-investigations-plugin/common';

const TOO_MANY_REQUESTS_STATUS_CODE = 429;

/** Kibana routes answer errors with a `ResponseErrorBody`; anything in front of them may not. */
const isKibanaHttpError = (error: unknown): error is IHttpFetchError<Partial<ResponseErrorBody>> =>
  isHttpFetchError(error);

/**
 * The reason a start failed. An HTTP error carries the server's message in its body: its own
 * message is the status text, which is empty over HTTP/2.
 */
export const getStartFailureMessage = (error: unknown): string => {
  if (isKibanaHttpError(error)) {
    const bodyMessage = error.body?.message;
    if (typeof bodyMessage === 'string' && bodyMessage) {
      return bodyMessage;
    }
    // A body that is not Kibana's JSON, such as a proxy's error page, leaves only the status.
    if (!error.message && error.response) {
      return i18n.translate('xpack.observability.alerts.investigationFailedStatus', {
        defaultMessage: 'The request failed with status {status}.',
        values: { status: error.response.status },
      });
    }
  }
  return error instanceof Error ? error.message : String(error);
};

/**
 * Whether a start was refused with 429. The daily investigation limits answer with it, but so does
 * Kibana's rate limiter, so the quotas decide whether a limit was reached.
 */
export const isTooManyRequestsError = (error: unknown): boolean =>
  isKibanaHttpError(error) &&
  (error.response?.status ?? error.body?.statusCode) === TOO_MANY_REQUESTS_STATUS_CODE;

export interface ReachedInvestigationLimit {
  /** A limit of 0 blocks new starts until it is changed, so waiting for the reset does not help. */
  blockedUntilChanged: boolean;
}

/** The daily limit that blocks manual starts, if any: manual starts count against both. */
export const getReachedInvestigationLimit = ({
  enabled,
  limits,
  counts,
}: InvestigationQuotasResponse): ReachedInvestigationLimit | undefined => {
  const reachedLimits = (['manual_investigation', 'total_investigation'] as const)
    .map((group) => ({ limit: limits[group], count: counts[group] }))
    .filter(({ limit, count }) => isInvestigationQuotaReached({ enabled, limit, count }));
  if (reachedLimits.length === 0) {
    return undefined;
  }
  return { blockedUntilChanged: reachedLimits.some(({ limit }) => limit === 0) };
};
