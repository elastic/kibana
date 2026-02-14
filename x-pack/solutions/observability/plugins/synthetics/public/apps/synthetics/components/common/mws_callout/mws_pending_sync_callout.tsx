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
        color="primary"
        iconType="info"
        data-test-subj="maintenanceWindowPendingSyncCallout"
      >
        <FormattedMessage
          id="xpack.synthetics.maintenanceWindowCallout.pendingSync.description"
          defaultMessage="A maintenance window was recently deactivated or deleted. Changes will be applied to private location monitors within {syncInterval} {syncInterval, plural, one {minute} other {minutes}}."
          values={{ syncInterval }}
        />
      </EuiCallOut>
      <EuiSpacer size="s" />
    </>
  );
};
