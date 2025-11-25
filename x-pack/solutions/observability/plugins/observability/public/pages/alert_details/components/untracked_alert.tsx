/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo } from 'react';
import { EuiButton, EuiCallOut, EuiFlexGroup } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { ALERT_STATUS_UNTRACKED, ALERT_UUID } from '@kbn/rule-data-utils';
import type { TopAlert } from '../../../typings/alerts';
import { useBulkUntrackAlerts } from '../hooks/use_bulk_untrack_alerts';

interface UntrackedAlertProps {
  alert: TopAlert;
  alertStatus: string | undefined;
  onUntrackAlert: () => void;
}

function UntrackedAlert({ alert, alertStatus, onUntrackAlert }: UntrackedAlertProps) {
  const isUntracked = useMemo(() => {
    return alertStatus === ALERT_STATUS_UNTRACKED;
  }, [alertStatus]);

  const { mutateAsync: untrackAlerts } = useBulkUntrackAlerts();
  const handleUntrackAlert = useCallback(async () => {
    const alertUuid = alert?.fields[ALERT_UUID];
    if (alertUuid) {
      await untrackAlerts({
        indices: ['.internal.alerts-observability.*'],
        alertUuids: [alertUuid],
      });
      onUntrackAlert();
    }
  }, [alert?.fields, untrackAlerts, onUntrackAlert]);

  return (
    <>
      {isUntracked && (
        <EuiCallOut
          announceOnMount
          data-test-subj="o11yAlertDetailsUntrackedAlertCallout"
          title={i18n.translate('xpack.observability.alertDetails.untrackedAlertCallout.title', {
            defaultMessage: 'This alert is untracked',
          })}
          color="warning"
          iconType="warning"
        >
          <p>
            {i18n.translate('xpack.observability.alertDetails.untrackedAlertCallout.message', {
              defaultMessage:
                'This alert is no longer being tracked. It may have been untracked manually or because the rule was disabled.',
            })}
          </p>
          <EuiFlexGroup gutterSize="s" justifyContent="flexStart">
            <EuiButton
              data-test-subj="o11yAlertDetailsUntrackedAlertCalloutMarkAsUntrackedButton"
              color="warning"
              fill
              iconType="eyeClosed"
              onClick={handleUntrackAlert}
            >
              {i18n.translate(
                'xpack.observability.alertDetails.alertStaleCallout.markAsUntrackedButton',
                {
                  defaultMessage: 'Untrack',
                }
              )}
            </EuiButton>
          </EuiFlexGroup>
        </EuiCallOut>
      )}
    </>
  );
}

// eslint-disable-next-line import/no-default-export
export default UntrackedAlert;
