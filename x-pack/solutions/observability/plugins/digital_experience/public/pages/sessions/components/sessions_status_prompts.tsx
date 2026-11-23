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
import {
  SESSIONS_INDEX_PATTERN,
  type SessionsSetUpBlocker,
  type SessionsStatus,
} from '../../../../common/sessions';
import { DIGITAL_EXPERIENCE_EBT_ACTIONS, SESSIONS_EBT_ELEMENTS } from '../../../ebt_constants';
import type { Formatters } from '../../../hooks/use_formatters';
import { httpErrorMessage } from '../../../utils/http_error_message';

const SET_UP_BY_OTHERS_TEXT = i18n.translate(
  'xpack.digitalExperience.sessions.status.setUpByOthersText',
  {
    defaultMessage:
      'They are set up automatically when someone who can read your EDOT Browser data in full and write to the {sessionsIndex} indices opens Digital Experience.',
    values: { sessionsIndex: SESSIONS_INDEX_PATTERN },
  }
);

const SET_UP_BLOCKED_TEXT: Record<SessionsSetUpBlocker, string> = {
  taskManager: i18n.translate('xpack.digitalExperience.sessions.status.setUpBlocked.taskManager', {
    defaultMessage:
      'They cannot be set up: Kibana needs the Task Manager plugin, which builds them in the background.',
  }),
  encryptionKey: i18n.translate(
    'xpack.digitalExperience.sessions.status.setUpBlocked.encryptionKey',
    {
      defaultMessage:
        'They cannot be set up until {setting} is set in kibana.yml, so Kibana can store the API key they are built with.',
      values: { setting: 'xpack.encryptedSavedObjects.encryptionKey' },
    }
  ),
};

/** Who sets sessions up, for a user who can't: or why nobody can. */
export const setUpByOthersText = (setUpBlocker: SessionsSetUpBlocker | null): string =>
  setUpBlocker ? SET_UP_BLOCKED_TEXT[setUpBlocker] : SET_UP_BY_OTHERS_TEXT;

const ASK_MANAGER_TEXT = i18n.translate('xpack.digitalExperience.sessions.status.askManagerText', {
  defaultMessage:
    'An administrator with the Manage session summaries privilege of Digital Experience in all spaces can turn them back on.',
});

export const EnableError = ({ error }: { error: Error }) => (
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

export interface EnableProps {
  /** The user can set sessions up, or give them a working key again: the status's `autoEnable`. */
  canEnable: boolean;
  /** The user can turn sessions off and back on. */
  canManage: boolean;
  onEnable: () => void;
  enabling: boolean;
  enableError: Error | undefined;
}

/**
 * Sessions aren't set up yet: a button to try again when setting them up failed, or who sets them
 * up.
 */
export function EnableSessionsPrompt({
  canEnable,
  onEnable,
  enabling,
  enableError,
  setUpBlocker,
}: Omit<EnableProps, 'canManage'> & { setUpBlocker: SessionsSetUpBlocker | null }) {
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
          {!canEnable && <p>{setUpByOthersText(setUpBlocker)}</p>}
          {enableError && <EnableError error={enableError} />}
        </>
      }
      actions={
        canEnable ? (
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
 * Sessions are set up but need attention: they were turned off, their API key no longer works, the
 * last run of the summaries task failed, or it is behind. Nothing shows when they're healthy.
 */
export function SessionsStatusCallout({
  status,
  canEnable,
  canManage,
  onEnable,
  enabling,
  enableError,
}: EnableProps & { status: SessionsStatus }) {
  if (status.disabled) {
    return (
      <>
        <KbnWarningCallout
          data-test-subj="digitalExperienceSessionsDisabled"
          size="s"
          title={i18n.translate('xpack.digitalExperience.sessions.status.disabledTitle', {
            defaultMessage: 'Sessions are turned off',
          })}
          text={
            <p>
              {i18n.translate('xpack.digitalExperience.sessions.status.disabledDescription', {
                defaultMessage:
                  'No new sessions are built; the sessions built before they were turned off are kept.',
              })}{' '}
              {canManage ? null : ASK_MANAGER_TEXT}
            </p>
          }
          actionProps={
            canManage
              ? {
                  primary: {
                    children: i18n.translate(
                      'xpack.digitalExperience.sessions.status.turnOnButtonLabel',
                      { defaultMessage: 'Turn sessions on' }
                    ),
                    'data-test-subj': 'digitalExperienceSessionsTurnOn',
                    ...getEbtProps({
                      action: DIGITAL_EXPERIENCE_EBT_ACTIONS.ENABLE_SESSIONS,
                      element: SESSIONS_EBT_ELEMENTS.TURN_ON,
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
              {canEnable ? null : setUpByOthersText(status.setUpBlocker)}
            </p>
          }
          actionProps={
            canEnable
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
                    'The task that builds sessions failed, so new sessions are missing. An administrator with the Manage session summaries privilege can see why.',
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
 * The time range starts before the sessions are built from, so that part may miss sessions: the
 * task builds only the lookback, though it doesn't delete what it built before.
 */
export function SessionsRetentionCallout({
  retentionDays,
  rangeStart,
  formatters: { formatDate },
}: {
  retentionDays: number;
  rangeStart: number;
  formatters: Formatters;
}) {
  const earliest = Date.now() - retentionDays * 24 * 60 * 60 * 1000;
  if (rangeStart >= earliest) {
    return null;
  }
  return (
    <>
      <KbnInfoCallout
        data-test-subj="digitalExperienceSessionsRetention"
        size="s"
        title={i18n.translate('xpack.digitalExperience.sessions.status.retentionTitle', {
          defaultMessage:
            'Sessions are built from the last {days} days of data, so this time range may be missing sessions before {earliest}.',
          values: { days: retentionDays, earliest: formatDate(earliest) },
        })}
      />
      <EuiSpacer size="m" />
    </>
  );
}
