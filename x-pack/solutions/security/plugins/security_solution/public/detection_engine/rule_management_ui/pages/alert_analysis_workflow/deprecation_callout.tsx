/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { KbnWarningCallout } from '@kbn/ui-callout';
import {
  ALERTZERO_APP_ID,
  ALERTZERO_ENABLED_SETTING_ID,
  SYSTEM_SECURITY_WATCH_FLOOR_ID,
} from '@kbn/alertzero-common';
import { useKibana } from '../../../../common/lib/kibana';
import * as translations from './translations';

export const AlertAnalysisWorkflowDeprecationCallout: React.FC = () => {
  const {
    services: { application, uiSettings },
  } = useKibana();

  // The setting is only declared when `xpack.alertzero.enabled` is on, so without it there is
  // nowhere to send the user.
  const isAlertZeroAvailable = uiSettings.isDeclared(ALERTZERO_ENABLED_SETTING_ID);
  const isAlertZeroEnabled =
    isAlertZeroAvailable && uiSettings.get<boolean>(ALERTZERO_ENABLED_SETTING_ID) === true;

  const getPrimaryAction = () => {
    if (!isAlertZeroAvailable) {
      return undefined;
    }

    if (!isAlertZeroEnabled) {
      return {
        children: translations.DEPRECATION_CALLOUT_ENABLE_ALERTZERO,
        href: application.getUrlForApp('management', {
          path: `/kibana/settings?query=${encodeURIComponent(ALERTZERO_ENABLED_SETTING_ID)}`,
        }),
        'data-test-subj': 'alertAnalysisWorkflowDeprecationEnableAlertZero',
      };
    }

    return {
      children: translations.DEPRECATION_CALLOUT_GO_TO_ALERTZERO,
      href: application.getUrlForApp(ALERTZERO_APP_ID, {
        path: `/watches/${SYSTEM_SECURITY_WATCH_FLOOR_ID}`,
      }),
      'data-test-subj': 'alertAnalysisWorkflowDeprecationGoToAlertZero',
    };
  };

  return (
    <KbnWarningCallout
      announceOnMount={false}
      data-test-subj="alertAnalysisWorkflowDeprecationCallout"
      title={translations.DEPRECATION_CALLOUT_TITLE}
      text={<p>{translations.DEPRECATION_CALLOUT_BODY}</p>}
      actionProps={{ primary: getPrimaryAction() }}
    />
  );
};
