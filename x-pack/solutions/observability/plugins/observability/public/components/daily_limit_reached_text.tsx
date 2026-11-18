/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiButton, EuiSpacer, EuiText } from '@elastic/eui';
import { FormattedMessage, FormattedRelative } from '@kbn/i18n-react';
import { getEbtProps } from '@kbn/ebt-click';

interface DailyLimitReachedTextProps {
  message: string;
  resetsAt: string;
  /** A reached limit of 0 blocks new starts until it is changed, whatever the reset. */
  blockedUntilChanged: boolean;
  canManage: boolean;
  /** Where the limits are changed; only offered to users who may change them. */
  changeLimitsUrl?: string;
}

/** Toast text for a start refused by a daily investigation limit. */
export function DailyLimitReachedText({
  message,
  resetsAt,
  blockedUntilChanged,
  canManage,
  changeLimitsUrl,
}: DailyLimitReachedTextProps) {
  return (
    <>
      <EuiText size="s">
        <p>
          {/* The server's refusal is a sentence fragment; the lines below are full sentences. */}
          {message.endsWith('.') ? (
            message
          ) : (
            <FormattedMessage
              id="xpack.observability.alerts.investigationLimitReachedSentence"
              defaultMessage="{message}."
              values={{ message }}
            />
          )}
        </p>
        <p>
          {blockedUntilChanged ? (
            <FormattedMessage
              id="xpack.observability.alerts.investigationLimitBlockedUntilChanged"
              defaultMessage="New investigations stay blocked until the limit is changed or enforcement is turned off."
            />
          ) : (
            <FormattedMessage
              id="xpack.observability.alerts.investigationLimitResets"
              defaultMessage="The limit resets {resetIn}."
              values={{ resetIn: <FormattedRelative value={resetsAt} /> }}
            />
          )}
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
              action: 'changeInvestigationLimits',
              element: 'investigationStartFailureToast',
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
