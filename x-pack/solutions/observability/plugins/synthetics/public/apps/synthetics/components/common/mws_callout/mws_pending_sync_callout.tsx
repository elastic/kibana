/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiSpacer, EuiText } from '@elastic/eui';
import { KbnWarningCallout } from '@kbn/ui-callout';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { SyncNowLink } from './sync_now_link';
import { MwsAgentVersionWarningLine } from './mws_agent_version_warning_line';

export const MwsPendingSyncCallout = ({
  hasOutdatedAgent = false,
}: {
  hasOutdatedAgent?: boolean;
}) => {
  return (
    <>
      <KbnWarningCallout
        title={i18n.translate('xpack.synthetics.maintenanceWindowCallout.pendingSync.title', {
          defaultMessage: 'Maintenance window changes pending',
        })}
        data-test-subj="maintenanceWindowPendingSyncCallout"
      >
        <FormattedMessage
          id="xpack.synthetics.maintenanceWindowCallout.pendingSync.description"
          defaultMessage="One or more maintenance windows have been recently modified or deleted."
        />
        <EuiSpacer size="s" />
        <EuiText size="xs" color="subdued">
          <FormattedMessage
            id="xpack.synthetics.maintenanceWindowCallout.pendingSync.syncNote"
            defaultMessage="Private location monitors will update shortly. {syncNowLink}"
            values={{ syncNowLink: <SyncNowLink /> }}
          />
        </EuiText>
        {hasOutdatedAgent && <MwsAgentVersionWarningLine />}
      </KbnWarningCallout>
      <EuiSpacer size="s" />
    </>
  );
};
