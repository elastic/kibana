/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiButton, EuiEmptyPrompt, EuiSpacer, EuiText } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { getEbtProps } from '@kbn/ebt-click';
import { KbnDangerCallout, KbnInfoCallout, KbnWarningCallout } from '@kbn/ui-callout';
import type { SessionsStatus } from '../../../../common/sessions';
import { DIGITAL_EXPERIENCE_EBT_ACTIONS, SESSIONS_EBT_ELEMENTS } from '../../../ebt_constants';
import type { Formatters } from '../../../hooks/use_formatters';
import { httpErrorMessage } from '../../../utils/http_error_message';

const ASK_ADMIN_TEXT = i18n.translate('xpack.digitalExperience.sessions.status.askAdminText', {
  defaultMessage:
    'Ask an administrator with the Set up session summaries privilege of Digital Experience to set them up.',
});

const EnableError = ({ error }: { error: Error }) => (
  <>
    <EuiSpacer size="m" />
    <KbnDangerCallout
      data-test-subj="digitalExperienceSessionsEnableError"
      announceOnMount
      size="s"
      title={i18n.translate('xpack.digitalExperience.sessions.status.enableErrorTitle', {
        defaultMessage: 'Could not set up sessions',
      })}
      text={httpErrorMessage(error)}
    />
  </>
);

interface EnableProps {
  canManage: boolean;
  onEnable: () => void;
  enabling: boolean;
  enableError: Error | undefined;
}

/** Sessions aren't set up yet: a button to set them up, or who to ask. */
export function EnableSessionsPrompt({ canManage, onEnable, enabling, enableError }: EnableProps) {
  return (
    <EuiEmptyPrompt
      data-test-subj="digitalExperienceSessionsNotEnabled"
      iconType="users"
      title={
        <h2>
          {i18n.translate('xpack.digitalExperience.sessions.status.notEnabledTitle', {
            defaultMessage: 'Set up sessions',
          })}
        </h2>
      }
      body={
        <>
          <p>
            {i18n.translate('xpack.digitalExperience.sessions.status.notEnabledDescription', {
              defaultMessage:
                'Sessions group the page views, clicks and errors of each visit to your applications. A background task builds them from your EDOT Browser data every minute, with an API key granted on behalf of whoever sets them up, so they hold only what that user can read.',
            })}
          </p>
          {!canManage && <p>{ASK_ADMIN_TEXT}</p>}
          {enableError && <EnableError error={enableError} />}
        </>
      }
      actions={
        canManage ? (
          <EuiButton
            data-test-subj="digitalExperienceSessionsEnable"
            {...getEbtProps({
              action: DIGITAL_EXPERIENCE_EBT_ACTIONS.ENABLE_SESSIONS,
              element: SESSIONS_EBT_ELEMENTS.ENABLE,
            })}
            fill
            isLoading={enabling}
            onClick={onEnable}
          >
            {i18n.translate('xpack.digitalExperience.sessions.status.enableButtonLabel', {
              defaultMessage: 'Set up sessions',
            })}
          </EuiButton>
        ) : undefined
      }
    />
  );
}

/**
 * Sessions are set up but need attention: their API key no longer works, the last run of the
 * summaries task failed, or it is behind. Nothing shows when they're healthy.
 */
export function SessionsStatusCallout({
  status,
  canManage,
  onEnable,
  enabling,
  enableError,
}: EnableProps & { status: SessionsStatus }) {
  if (status.apiKeyInvalid) {
    return (
      <>
        <KbnWarningCallout
          data-test-subj="digitalExperienceSessionsApiKeyInvalid"
          size="s"
          title={i18n.translate('xpack.digitalExperience.sessions.status.apiKeyInvalidTitle', {
            defaultMessage: 'Sessions are not being updated',
          })}
          text={
            <p>
              {i18n.translate('xpack.digitalExperience.sessions.status.apiKeyInvalidDescription', {
                defaultMessage:
                  'The API key sessions are built with was invalidated or has expired, so new sessions are missing until they are set up again.',
              })}{' '}
              {canManage ? null : ASK_ADMIN_TEXT}
            </p>
          }
          actionProps={
            canManage
              ? {
                  primary: {
                    children: i18n.translate(
                      'xpack.digitalExperience.sessions.status.setUpAgainButtonLabel',
                      { defaultMessage: 'Set up sessions again' }
                    ),
                    'data-test-subj': 'digitalExperienceSessionsUpdate',
                    ...getEbtProps({
                      action: DIGITAL_EXPERIENCE_EBT_ACTIONS.ENABLE_SESSIONS,
                      element: SESSIONS_EBT_ELEMENTS.UPDATE,
                    }),
                    isLoading: enabling,
                    onClick: onEnable,
                  },
                }
              : undefined
          }
        />
        {enableError && <EnableError error={enableError} />}
        <EuiSpacer size="m" />
      </>
    );
  }
  if (status.health === 'degraded') {
    return (
      <>
        <KbnDangerCallout
          data-test-subj="digitalExperienceSessionsDegraded"
          announceOnMount
          size="s"
          title={i18n.translate('xpack.digitalExperience.sessions.status.degradedTitle', {
            defaultMessage: 'Sessions are not being updated',
          })}
          text={
            // The message is filled in only for users who may see Elasticsearch details. The
            // others are pointed at someone who can, not at logs they usually cannot read.
            status.lastError?.message
              ? i18n.translate('xpack.digitalExperience.sessions.status.degradedReason', {
                  defaultMessage: 'The task that builds sessions failed: {error}',
                  values: { error: status.lastError.message },
                })
              : canManage
              ? i18n.translate('xpack.digitalExperience.sessions.status.degradedDescription', {
                  defaultMessage:
                    'The task that builds sessions failed, so new sessions are missing. Check the Kibana server logs.',
                })
              : i18n.translate('xpack.digitalExperience.sessions.status.degradedAskAdmin', {
                  defaultMessage:
                    'The task that builds sessions failed, so new sessions are missing. An administrator with the Set up session summaries privilege can see why.',
                })
          }
        />
        <EuiSpacer size="m" />
      </>
    );
  }
  if (status.health === 'lagging') {
    return (
      <>
        <KbnWarningCallout
          data-test-subj="digitalExperienceSessionsLagging"
          size="s"
          title={i18n.translate('xpack.digitalExperience.sessions.status.laggingTitle', {
            defaultMessage: 'Sessions are behind',
          })}
          text={i18n.translate('xpack.digitalExperience.sessions.status.laggingDescription', {
            defaultMessage:
              'Sessions from the last {minutes, plural, one {minute} other {# minutes}} may be missing or incomplete.',
            values: { minutes: Math.max(1, Math.round((status.lagSeconds ?? 0) / 60)) },
          })}
        />
        <EuiSpacer size="m" />
      </>
    );
  }
  // A failed setup with nothing else to show.
  return enableError ? (
    <>
      <EnableError error={enableError} />
      <EuiSpacer size="m" />
    </>
  ) : null;
}

/** Up to when events are in the sessions, once they're built. */
export function SessionsFreshness({
  status,
  formatters: { formatDate },
}: {
  status: SessionsStatus;
  formatters: Formatters;
}) {
  if (status.rebuilding || !status.summarizedUntil) {
    return null;
  }
  return (
    <EuiText size="xs" color="subdued" data-test-subj="digitalExperienceSessionsFreshness">
      {i18n.translate('xpack.digitalExperience.sessions.status.freshness', {
        defaultMessage: 'Includes events up to {time}',
        values: { time: formatDate(status.summarizedUntil) },
      })}
    </EuiText>
  );
}

/**
 * The time range starts before the oldest kept sessions, so that part is empty whatever happened
 * then.
 */
export function SessionsRetentionCallout({
  retentionDays,
  rangeStart,
}: {
  retentionDays: number;
  rangeStart: number;
}) {
  if (rangeStart >= Date.now() - retentionDays * 24 * 60 * 60 * 1000) {
    return null;
  }
  return (
    <>
      <KbnInfoCallout
        data-test-subj="digitalExperienceSessionsRetention"
        size="s"
        title={i18n.translate('xpack.digitalExperience.sessions.status.retentionTitle', {
          defaultMessage:
            'Sessions are kept for {days} days, so there are none before then in this time range.',
          values: { days: retentionDays },
        })}
      />
      <EuiSpacer size="m" />
    </>
  );
}
