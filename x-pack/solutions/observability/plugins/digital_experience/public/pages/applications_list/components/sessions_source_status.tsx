/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiSpacer } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { getEbtProps } from '@kbn/ebt-click';
import { KbnInfoCallout, KbnWarningCallout } from '@kbn/ui-callout';
import { SESSIONS_LOOKBACK_DAYS, type SessionsStatus } from '../../../../common/sessions';
import {
  APPLICATIONS_LIST_EBT_ELEMENTS,
  DIGITAL_EXPERIENCE_EBT_ACTIONS,
} from '../../../ebt_constants';
import type { Formatters } from '../../../hooks/use_formatters';
import {
  ASK_ADMIN_TEXT,
  EnableError,
  SessionsRetentionCallout,
  SessionsStatusCallout,
  type EnableProps,
} from '../../sessions/components/sessions_status_prompts';

/**
 * Why the EDOT Browser applications may be missing or incomplete, as they are read from the
 * sessions: not set up or being set up, being built, failing or behind, or not kept that far back.
 * Nothing shows when the sessions can answer for the whole time range.
 */
export function SessionsSourceStatus({
  status,
  rangeStart,
  formatters,
  ...enableProps
}: EnableProps & {
  status: SessionsStatus;
  /** Start of the time range the list was fetched for; unknown until it is. */
  rangeStart: number | undefined;
  formatters: Formatters;
}) {
  const { canManage, onEnable, enabling, enableError } = enableProps;

  if (!status.installed && enabling) {
    return (
      <>
        <KbnInfoCallout
          data-test-subj="digitalExperienceApplicationsSessionsEnabling"
          size="s"
          title={i18n.translate('xpack.digitalExperience.applications.sessions.enablingTitle', {
            defaultMessage: 'Setting up sessions',
          })}
          text={i18n.translate('xpack.digitalExperience.applications.sessions.enablingText', {
            defaultMessage:
              'EDOT Browser applications are listed from sessions, which are being set up for you now.',
          })}
        />
        <EuiSpacer size="m" />
      </>
    );
  }

  if (!status.installed) {
    return (
      <>
        <KbnWarningCallout
          data-test-subj="digitalExperienceApplicationsSessionsNotEnabled"
          size="s"
          title={i18n.translate('xpack.digitalExperience.applications.sessions.notEnabledTitle', {
            defaultMessage: 'Set up sessions to list EDOT Browser applications',
          })}
          text={
            <p>
              {i18n.translate('xpack.digitalExperience.applications.sessions.notEnabledText', {
                defaultMessage:
                  'EDOT Browser applications are listed from sessions, which a background task builds from your EDOT Browser data with an API key granted on behalf of whoever sets them up.',
              })}{' '}
              {canManage ? null : ASK_ADMIN_TEXT}
            </p>
          }
          actionProps={
            canManage
              ? {
                  primary: {
                    children: i18n.translate(
                      'xpack.digitalExperience.applications.sessions.enableButtonLabel',
                      { defaultMessage: 'Set up sessions' }
                    ),
                    'data-test-subj': 'digitalExperienceApplicationsSessionsEnable',
                    ...getEbtProps({
                      action: DIGITAL_EXPERIENCE_EBT_ACTIONS.ENABLE_SESSIONS,
                      element: APPLICATIONS_LIST_EBT_ELEMENTS.ENABLE_SESSIONS,
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

  return (
    <>
      {status.rebuilding && (
        <>
          <KbnInfoCallout
            data-test-subj="digitalExperienceApplicationsSessionsRebuilding"
            size="s"
            title={i18n.translate('xpack.digitalExperience.applications.sessions.rebuildingTitle', {
              defaultMessage: 'Building sessions',
            })}
            text={i18n.translate('xpack.digitalExperience.applications.sessions.rebuildingText', {
              defaultMessage:
                'EDOT Browser applications are listed from sessions, which are being built from up to {days} days of data. Until then, applications and their metrics may be missing or incomplete.',
              values: { days: SESSIONS_LOOKBACK_DAYS },
            })}
          />
          <EuiSpacer size="m" />
        </>
      )}
      <SessionsStatusCallout status={status} {...enableProps} />
      {rangeStart !== undefined && (
        <SessionsRetentionCallout
          retentionDays={status.retentionDays}
          rangeStart={rangeStart}
          formatters={formatters}
        />
      )}
    </>
  );
}
