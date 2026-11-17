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
import { getEbtProps } from '@kbn/ebt-click';

/** The user intends to change the daily investigation limits after reaching one. */
const CHANGE_INVESTIGATION_LIMITS_EBT_ACTION = 'changeInvestigationLimits';
const INVESTIGATION_START_FAILURE_EBT_ELEMENT = 'investigationStartFailureToast';

export interface DailyLimitReachedTextProps {
  message: string;
  resetsAt: string;
  canManage: boolean;
  /** Where the limits are changed; only offered to users who may change them. */
  changeLimitsUrl?: string;
}

/** Toast text for a start refused by a daily investigation limit. */
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
