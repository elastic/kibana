/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButtonIcon, EuiToolTip } from '@elastic/eui';
import React from 'react';
import { i18n } from '@kbn/i18n';
import { useAlertsUrl } from '../../monitor_details/monitor_summary/alert_actions';

export const AlertsLink = () => {
  const alertUrl = useAlertsUrl({ rangeFrom: 'now-12h/h', rangeTo: 'now' });

  return (
    <EuiToolTip content={VIEW_ALERTS}>
      <EuiButtonIcon
        data-test-subj="syntheticsAlertsLinkButton"
        aria-label={VIEW_ALERTS}
        href={alertUrl}
        iconType="inspect"
      />
    </EuiToolTip>
  );
};

const VIEW_ALERTS = i18n.translate('xpack.synthetics.monitorSummary.viewAlerts', {
  defaultMessage: 'View alerts',
});
