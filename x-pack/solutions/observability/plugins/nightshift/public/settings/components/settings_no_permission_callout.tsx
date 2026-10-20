/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiCallOut, EuiSpacer } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

export const SettingsNoPermissionCallout = () => (
  <>
    <EuiCallOut
      title={i18n.translate('xpack.nightshift.settings.noPermissionCalloutTitle', {
        defaultMessage: 'You need additional privileges to edit these settings',
      })}
      color="warning"
      iconType="lock"
      data-test-subj="streams-settings-no-permission-callout"
      announceOnMount={false}
    >
      <p>
        {i18n.translate('xpack.nightshift.settings.noPermissionCalloutDescription', {
          defaultMessage:
            'Editing these settings requires the Nightshift "Manage engines" privilege and the Advanced Settings "All" privilege. Contact your administrator if you need to make changes.',
        })}
      </p>
    </EuiCallOut>
    <EuiSpacer />
  </>
);
