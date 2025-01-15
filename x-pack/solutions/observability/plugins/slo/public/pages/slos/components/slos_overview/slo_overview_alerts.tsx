/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem, EuiSpacer, EuiText, EuiTitle, EuiPanel } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';
import { GetOverviewResponse } from '@kbn/slo-schema/src/rest_specs/routes/get_overview';
import { rulesLocatorID, RulesParams } from '@kbn/observability-plugin/public';
import { useAlertsUrl } from '../../../../hooks/use_alerts_url';
import { useKibana } from '../../../../hooks/use_kibana';
import { OverviewItem } from './overview_item';

export function SLOOverviewAlerts({
  data,
  isLoading,
}: {
  data?: GetOverviewResponse;
  isLoading: boolean;
}) {
  const {
    application,
    share: {
      url: { locators },
    },
  } = useKibana().services;

  const locator = locators.get<RulesParams>(rulesLocatorID);

  const getAlertsUrl = useAlertsUrl();

  return (
    <EuiPanel hasShadow={false} hasBorder={true}>
      <EuiFlexGroup alignItems="center" gutterSize="m">
        <EuiFlexItem grow={false}>
          <EuiTitle size="xs">
            <h3>
              {i18n.translate('xpack.slo.sLOsOverview.h3.burnRateLabel', {
                defaultMessage: 'Burn rate',
              })}
            </h3>
          </EuiTitle>
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiText color="subdued" size="s">
            {i18n.translate('xpack.slo.sLOsOverview.lastTextLabel', {
              defaultMessage: 'Last 24h',
            })}
          </EuiText>
        </EuiFlexItem>
      </EuiFlexGroup>

      <EuiSpacer size="xs" />
      <EuiFlexGroup justifyContent="spaceBetween">
        <OverviewItem
          title={data?.burnRateActiveAlerts}
          description={i18n.translate('xpack.slo.sLOsOverview.euiStat.burnRateActiveAlerts', {
            defaultMessage: 'Active alerts',
          })}
          titleColor="danger"
          isLoading={isLoading}
          onClick={() => {
            application.navigateToUrl(getAlertsUrl('active'));
          }}
        />
        <OverviewItem
          title={data?.burnRateRecoveredAlerts}
          description={i18n.translate('xpack.slo.sLOsOverview.euiStat.burnRateRecoveredAlerts', {
            defaultMessage: 'Recovered alerts',
          })}
          titleColor="success"
          isLoading={isLoading}
          onClick={() => {
            application.navigateToUrl(getAlertsUrl('recovered'));
          }}
        />
        <OverviewItem
          title={data?.burnRateRules}
          description={i18n.translate('xpack.slo.sLOsOverview.euiStat.burnRateRules', {
            defaultMessage: 'Rules',
          })}
          titleColor="default"
          isLoading={isLoading}
          onClick={() => {
            locator?.navigate({
              type: ['slo.rules.burnRate'],
            });
          }}
        />
      </EuiFlexGroup>
    </EuiPanel>
  );
}
