/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { ObservabilityAlertsTable } from '@kbn/observability-plugin/public';
import { SLO_ALERTS_TABLE_ID } from '@kbn/observability-shared-plugin/common';
import { AlertConsumers, SLO_RULE_TYPE_IDS } from '@kbn/rule-data-utils';
import React from 'react';
import { i18n } from '@kbn/i18n';
import { EuiLink, EuiText } from '@elastic/eui';
import { useAlertsUrl } from '../../../../hooks/use_alerts_url';
import { useKibana } from '../../../../hooks/use_kibana';
import { SloFlyoutPanel } from '../../shared_flyout/flyout_panel';
import { useSloDetailsContext } from '../slo_details_context';

const PANEL_TITLE = i18n.translate('xpack.slo.sloDetailsFlyout.alerts.alertsLabel', {
  defaultMessage: 'Alerts',
});
const ALERTS_LINK_TEXT = i18n.translate('xpack.slo.sloDetailsFlyout.alerts.alertsLinkText', {
  defaultMessage: 'Open in Alerts',
});

export function SloDetailsFlyoutAlerts() {
  const { slo } = useSloDetailsContext();
  const { data, http, notifications, fieldFormats, application, licensing, cases, settings } =
    useKibana().services;

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
      <ObservabilityAlertsTable
        id={SLO_ALERTS_TABLE_ID}
        data-test-subj="alertTable"
        ruleTypeIds={SLO_RULE_TYPE_IDS}
        consumers={[AlertConsumers.SLO, AlertConsumers.ALERTS, AlertConsumers.OBSERVABILITY]}
        query={{
          bool: {
            filter: [
              { term: { 'slo.id': slo.id } },
              { term: { 'slo.instanceId': slo.instanceId } },
            ],
          },
        }}
        pageSize={100}
        services={{
          data,
          http,
          notifications,
          fieldFormats,
          application,
          licensing,
          cases,
          settings,
        }}
        visibleColumns={[
          'kibana.alert.status',
          'kibana.alert.start',
          'kibana.alert.duration.us',
          'kibana.alert.rule.name',
          'kibana.alert.reason',
        ]}
        toolbarVisibility={{
          showDisplaySelector: false,
          showKeyboardShortcuts: false,
          showFullScreenSelector: false,
        }}
      />
    </SloFlyoutPanel>
  );
}
