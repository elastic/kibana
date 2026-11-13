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
import { KbnDangerCallout } from '@kbn/ui-callout';
import { DIGITAL_EXPERIENCE_EBT_ACTIONS, SESSIONS_EBT_ELEMENTS } from '../../../ebt_constants';
import { httpErrorMessage } from '../../../utils/http_error_message';

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
                'Sessions group the page views, clicks and errors of each visit to your applications. They are read from the sessions index, which is created with the access of whoever sets them up.',
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
