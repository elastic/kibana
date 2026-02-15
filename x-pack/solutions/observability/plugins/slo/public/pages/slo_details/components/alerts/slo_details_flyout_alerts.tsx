/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { EuiLink, EuiText } from '@elastic/eui';
import { useAlertsUrl } from '../../../../hooks/use_alerts_url';
import { SloFlyoutPanel } from '../../shared_flyout/flyout_panel';
import { useSloDetailsContext } from '../slo_details_context';
import { SloDetailsAlertsTable } from './slo_details_alerts_table';

const PANEL_TITLE = i18n.translate('xpack.slo.sloDetailsFlyout.alerts.alertsLabel', {
  defaultMessage: 'Alerts',
});
const ALERTS_LINK_TEXT = i18n.translate('xpack.slo.sloDetailsFlyout.alerts.alertsLinkText', {
  defaultMessage: 'Open in Alerts',
});

export function SloDetailsFlyoutAlerts() {
  const { slo } = useSloDetailsContext();
  const getAlertsUrl = useAlertsUrl();

  return (
    <SloFlyoutPanel
      title={PANEL_TITLE}
      append={
        <EuiLink
          href={getAlertsUrl({
            kuery: `slo.id:"${slo.id}" and slo.instanceId:"${slo.instanceId}"`,
          })}
          data-test-subj="sloDetailsFlyoutAlertsLink"
        >
          <EuiText size="xs">{ALERTS_LINK_TEXT}</EuiText>
        </EuiLink>
      }
    >
      <SloDetailsAlertsTable />
    </SloFlyoutPanel>
  );
}
