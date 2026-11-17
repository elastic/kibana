/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import moment from 'moment';
import { EuiButton, EuiSpacer, EuiText } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import {
  isHttpFetchError,
  type IHttpFetchError,
  type ResponseErrorBody,
} from '@kbn/core-http-browser';
import { getEbtProps } from '@kbn/ebt-click';

const DAILY_LIMIT_STATUS_CODE = 429;

/** The user intends to change the daily investigation limits after reaching one. */
const CHANGE_INVESTIGATION_LIMITS_EBT_ACTION = 'changeInvestigationLimits';
const INVESTIGATION_START_FAILURE_EBT_ELEMENT = 'investigationStartFailureToast';

/** Kibana routes answer errors with a `ResponseErrorBody`. */
const isKibanaHttpError = (error: unknown): error is IHttpFetchError<ResponseErrorBody> =>
  isHttpFetchError(error);

/**
 * The reason a start failed. An HTTP error carries the server's message in its body: its own
 * message is the status text, which is empty over HTTP/2.
 */
export const getStartFailureMessage = (error: unknown): string => {
  if (isKibanaHttpError(error) && error.body?.message) {
    return error.body.message;
  }
  return error instanceof Error ? error.message : String(error);
};

/** Whether a start was refused because a daily investigation limit was reached. */
export const isDailyLimitError = (error: unknown): boolean =>
  isKibanaHttpError(error) &&
  (error.response?.status ?? error.body?.statusCode) === DAILY_LIMIT_STATUS_CODE;

export interface DailyLimitReachedTextProps {
  message: string;
  resetsAt: string;
  canManage: boolean;
  /** Where the limits are changed; only offered to users who may change them. */
  changeLimitsUrl?: string;
}

export function DailyLimitReachedText({
  message,
  resetsAt,
  canManage,
  changeLimitsUrl,
}: DailyLimitReachedTextProps) {
  return (
    <>
      <EuiText size="s">
        <p>{message}</p>
        <p>
          <FormattedMessage
            id="xpack.observability.alerts.investigationLimitResets"
            defaultMessage="The limit resets {resetIn}."
            values={{ resetIn: moment(resetsAt).fromNow() }}
          />
        </p>
        {!canManage && (
          <p>
            <FormattedMessage
              id="xpack.observability.alerts.investigationLimitAskAdmin"
              defaultMessage="Ask an admin to raise the limit."
            />
          </p>
        )}
        {canManage && !changeLimitsUrl && (
          <p>
            <FormattedMessage
              id="xpack.observability.alerts.investigationLimitChangeInSettings"
              defaultMessage="You can raise the limit in the Nightshift investigation settings."
            />
          </p>
        )}
      </EuiText>
      {canManage && changeLimitsUrl && (
        <>
          <EuiSpacer size="m" />
          <EuiButton
            size="s"
            color="danger"
            href={changeLimitsUrl}
            data-test-subj="alertInvestigationChangeLimitsLink"
            {...getEbtProps({
              action: CHANGE_INVESTIGATION_LIMITS_EBT_ACTION,
              element: INVESTIGATION_START_FAILURE_EBT_ELEMENT,
            })}
          >
            <FormattedMessage
              id="xpack.observability.alerts.investigationLimitChangeLimits"
              defaultMessage="Change limits"
            />
          </EuiButton>
        </>
      )}
    </>
  );
}
