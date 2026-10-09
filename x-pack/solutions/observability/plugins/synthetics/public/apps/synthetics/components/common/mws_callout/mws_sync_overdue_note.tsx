/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiText } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { SyncNowLink } from './sync_now_link';

export const MwsSyncOverdueNote = () => (
  <EuiText size="xs" data-test-subj="maintenanceWindowSyncOverdueNote">
    <FormattedMessage
      id="xpack.synthetics.maintenanceWindowCallout.syncOverdueNote"
      defaultMessage="Private location monitors haven't applied the latest maintenance window changes yet. {syncNowLink}"
      values={{ syncNowLink: <SyncNowLink /> }}
    />
  </EuiText>
);
