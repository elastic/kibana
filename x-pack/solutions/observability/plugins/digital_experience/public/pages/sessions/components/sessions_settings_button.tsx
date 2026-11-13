/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { EuiButtonEmpty } from '@elastic/eui';
import { getEbtProps } from '@kbn/ebt-click';
import { i18n } from '@kbn/i18n';
import { DIGITAL_EXPERIENCE_EBT_ACTIONS, SESSIONS_EBT_ELEMENTS } from '../../../ebt_constants';
import { useKibanaServices } from '../../../hooks/use_kibana_services';
import { SessionsSettingsFlyout } from './sessions_settings_flyout';

const SAVED_MESSAGE = i18n.translate('xpack.digitalExperience.sessions.settings.savedToast', {
  defaultMessage: 'Session summaries settings saved',
});

/** Opens the session summaries settings, for users with the Configure session summaries privilege. */
export function SessionsSettingsButton({ onSaved }: { onSaved: () => void }) {
  const { notifications } = useKibanaServices();
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <EuiButtonEmpty
        iconType="gear"
        onClick={() => setIsOpen(true)}
        data-test-subj="digitalExperienceSessionsSettings"
        {...getEbtProps({
          action: DIGITAL_EXPERIENCE_EBT_ACTIONS.OPEN_SESSIONS_SETTINGS,
          element: SESSIONS_EBT_ELEMENTS.SETTINGS,
        })}
      >
        {i18n.translate('xpack.digitalExperience.sessions.settings.buttonLabel', {
          defaultMessage: 'Settings',
        })}
      </EuiButtonEmpty>
      {isOpen && (
        <SessionsSettingsFlyout
          onClose={() => setIsOpen(false)}
          onSaved={() => {
            setIsOpen(false);
            notifications.toasts.addSuccess(SAVED_MESSAGE);
            onSaved();
          }}
        />
      )}
    </>
  );
}
