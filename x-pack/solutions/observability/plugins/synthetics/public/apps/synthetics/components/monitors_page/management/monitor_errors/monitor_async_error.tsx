/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useState } from 'react';
import { useSelector } from 'react-redux';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { EuiButton, EuiCallOut, EuiSpacer } from '@elastic/eui';
import { selectMonitorListState, selectServiceLocationsState } from '../../../../state';

export const MonitorAsyncError = () => {
  const [isDismissed, setIsDismissed] = useState(false);
  const {
    data: { syncErrors },
  } = useSelector(selectMonitorListState);
  const { locations } = useSelector(selectServiceLocationsState);

  return syncErrors && syncErrors.length > 0 && !isDismissed ? (
    <>
      <EuiCallOut
        title={
          <FormattedMessage
            id="xpack.synthetics.monitorManagement.monitorSync.failure.title"
            defaultMessage="Some monitors are not running correctly"
          />
        }
        color="warning"
        iconType="warning"
      >
        <p>
          <FormattedMessage
            id="xpack.synthetics.monitorManagement.monitorSync.failure.content"
            defaultMessage="There was a problem running your monitors for one or more locations:"
          />
        </p>
        <ul style={{ maxHeight: 100, overflow: 'auto' }}>
          {Object.values(syncErrors ?? {}).map((e) => {
            return (
              <li key={e.locationId}>
                {`${
                  locations.find((location) => location.id === e.locationId)?.label
                } - ${STATUS_LABEL}: ${e.error?.status ?? NOT_AVAILABLE_LABEL}; ${REASON_LABEL}: ${
                  e.error?.reason ?? NOT_AVAILABLE_LABEL
                }`}
              </li>
            );
          })}
        </ul>
        <EuiButton
          data-test-subj="syntheticsMonitorAsyncErrorButton"
          onClick={() => setIsDismissed(true)}
          color="warning"
        >
          {DISMISS_LABEL}
        </EuiButton>
      </EuiCallOut>
      <EuiSpacer size="m" />
    </>
  ) : null;
};

const REASON_LABEL = i18n.translate(
  'xpack.synthetics.monitorManagement.monitorSync.failure.reasonLabel',
  {
    defaultMessage: 'Reason',
  }
);

const STATUS_LABEL = i18n.translate(
  'xpack.synthetics.monitorManagement.monitorSync.failure.statusLabel',
  {
    defaultMessage: 'Status',
  }
);

const NOT_AVAILABLE_LABEL = i18n.translate(
  'xpack.synthetics.monitorManagement.monitorSync.failure.notAvailable',
  {
    defaultMessage: 'Not available',
  }
);

const DISMISS_LABEL = i18n.translate(
  'xpack.synthetics.monitorManagement.monitorSync.failure.dismissLabel',
  {
    defaultMessage: 'Dismiss',
  }
);
