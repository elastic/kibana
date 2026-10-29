/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiButton, EuiEmptyPrompt, EuiSpacer } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { getEbtProps } from '@kbn/ebt-click';
import { KbnDangerCallout, KbnWarningCallout } from '@kbn/ui-callout';
import type { SessionsStatus } from '../../../../common/sessions';
import { DIGITAL_EXPERIENCE_EBT_ACTIONS, SESSIONS_EBT_ELEMENTS } from '../../../ebt_constants';

const ASK_ADMIN_TEXT = i18n.translate('xpack.digitalExperience.sessions.status.askAdminText', {
  defaultMessage:
    'Ask an administrator with the Manage sessions privilege of Digital Experience to set them up.',
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
      text={error.message}
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
                'Sessions group the page views, clicks and errors of each visit to your applications. A background transform builds them from your EDOT Browser data, reading it with the access of whoever sets them up.',
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
 * Sessions are set up but need attention: an update to this Kibana version or configuration, or a
 * failing or lagging transform. Nothing shows when they're healthy.
 */
export function SessionsStatusCallout({
  status,
  canManage,
  onEnable,
  enabling,
  enableError,
}: EnableProps & { status: SessionsStatus }) {
  if (status.needsUpdate) {
    return (
      <>
        <KbnWarningCallout
          data-test-subj="digitalExperienceSessionsNeedUpdate"
          size="s"
          title={i18n.translate('xpack.digitalExperience.sessions.status.needsUpdateTitle', {
            defaultMessage: 'Sessions need an update',
          })}
          text={
            <p>
              {i18n.translate('xpack.digitalExperience.sessions.status.needsUpdateDescription', {
                defaultMessage:
                  'Sessions were set up by an earlier version or with other settings, so new sessions may be missing or incomplete until they are updated.',
              })}{' '}
              {canManage ? null : ASK_ADMIN_TEXT}
            </p>
          }
          actionProps={
            canManage
              ? {
                  primary: {
                    children: i18n.translate(
                      'xpack.digitalExperience.sessions.status.updateButtonLabel',
                      { defaultMessage: 'Update sessions' }
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
            status.reason ??
            i18n.translate('xpack.digitalExperience.sessions.status.degradedDescription', {
              defaultMessage:
                'The sessions transform failed, so new sessions are missing. Check the transform in Stack Management.',
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
  return null;
}
