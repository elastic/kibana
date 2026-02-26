/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiCallOut, EuiSpacer } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';

export const MwsPendingSyncCallout = ({ syncInterval }: { syncInterval: number }) => {
  return (
    <>
      <EuiCallOut
        title={i18n.translate('xpack.synthetics.maintenanceWindowCallout.pendingSync.title', {
          defaultMessage: 'Maintenance window changes pending',
        })}
        color="warning"
        iconType="info"
        data-test-subj="maintenanceWindowPendingSyncCallout"
      >
        <FormattedMessage
          id="xpack.synthetics.maintenanceWindowCallout.pendingSync.description"
          defaultMessage="One or more maintenance windows have been recently modified or deleted. It may take up to {syncInterval} {syncInterval, plural, one {minute} other {minutes}} for changes to be applied to private location monitors."
          values={{ syncInterval }}
        />
      </EuiCallOut>
      <EuiSpacer size="s" />
    </>
  );
};
