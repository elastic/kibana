/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiLink,
  EuiLoadingChart,
  EuiPanel,
  EuiStat,
  EuiText,
  EuiTextColor,
  EuiTitle,
} from '@elastic/eui';
import numeral from '@elastic/numeral';
import { sloDetailsHistoryLocatorID } from '@kbn/deeplinks-observability';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { encode } from '@kbn/rison';
import { ALERT_EVALUATION_VALUE } from '@kbn/rule-registry-plugin/common/technical_rule_data_field_names';
import type { GetSLOResponse } from '@kbn/slo-schema';
import { paths } from '@kbn/slo-shared-plugin/common/locators/paths';
import React from 'react';
import { useKibana } from '../../../../hooks/use_kibana';
import { ErrorRateChart } from '../../../slo/error_rate_chart';
import type { BurnRateAlert } from '../../types';
import { getActionGroupWindow } from '../../utils/alert';
import { getLastDurationInUnit } from '../../utils/last_duration_i18n';
import { getAlertTimeRange, getChartTimeRange } from '../../utils/time_range';

interface Props {
  alert: BurnRateAlert;
  slo?: GetSLOResponse;
  isLoading: boolean;
}
export function ErrorRatePanel({ alert, slo, isLoading }: Props) {
  const {
    services: {
      http,
      share: {
        url: { locators },
      },
    },
  } = useKibana();
  const chartTimeRange = getChartTimeRange(alert);
  const actionGroupWindow = getActionGroupWindow(alert);
  const alertTimeRange = getAlertTimeRange(alert);

  const burnRate = alert.fields[ALERT_EVALUATION_VALUE];

  const historyLocator = locators.get(sloDetailsHistoryLocatorID);

  if (isLoading) {
    return <EuiLoadingChart size="m" data-test-subj="loading" />;
  }

  if (!slo) {
    return null;
  }

  return (
    <EuiPanel paddingSize="m" color="transparent" hasBorder data-test-subj="burnRatePanel">
      <EuiFlexGroup direction="column" gutterSize="m">
        <EuiFlexGroup direction="column" gutterSize="none">
          <EuiFlexGroup direction="row" justifyContent="spaceBetween">
            <EuiFlexItem grow={false}>
              <EuiTitle size="xs">
                <h2>
                  {i18n.translate('xpack.slo.burnRateRule.alertDetailsAppSection.burnRate.title', {
                    defaultMessage: '{sloName} burn rate',
                    values: { sloName: slo.name },
                  })}
                </h2>
              </EuiTitle>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiLink
                color="text"
                data-test-subj="o11yErrorRatePanelSloDetailsLink"
                href={
                  historyLocator?.getRedirectUrl({
                    id: slo.id,
                    instanceId: slo.instanceId,
                    encodedAppState: encode({
                      range: { from: chartTimeRange.from, to: chartTimeRange.to },
                    }),
                  }) ??
                  http.basePath.prepend(
                    paths.sloDetails(slo.id, slo.instanceId, undefined, 'history')
                  )
                }
              >
                <EuiIcon type="sortRight" style={{ marginRight: '4px' }} />
                <FormattedMessage
                  id="xpack.slo.burnRateRule.alertDetailsAppSection.burnRate.sloDetailsLink"
                  defaultMessage="SLO details"
                />
              </EuiLink>
            </EuiFlexItem>
          </EuiFlexGroup>
          <EuiFlexItem grow={false}>
            <EuiText size="s" color="subdued">
              <span>{getLastDurationInUnit(chartTimeRange)}</span>
            </EuiText>
          </EuiFlexItem>
        </EuiFlexGroup>
        <EuiFlexGroup direction="row" gutterSize="m">
          <EuiFlexItem grow={1}>
            <EuiPanel color="danger" hasShadow={false} paddingSize="s" grow={false}>
              <EuiFlexGroup
                justifyContent="spaceBetween"
                direction="column"
                style={{ minHeight: '100%' }}
              >
                <EuiFlexItem>
                  <EuiText color="default" size="m">
                    <span>
                      {i18n.translate(
                        'xpack.slo.burnRateRule.alertDetailsAppSection.burnRate.thresholdBreachedTitle',
                        { defaultMessage: 'Threshold breached' }
                      )}
                      <EuiIcon type="warning" style={{ marginLeft: '4px' }} />
                    </span>
                  </EuiText>
                </EuiFlexItem>
                <EuiFlexItem>
                  <EuiStat
                    title={`${numeral(burnRate).format('0.[00]')}x`}
                    titleColor="default"
                    titleSize="s"
                    textAlign="right"
                    isLoading={isLoading}
                    data-test-subj="burnRateStat"
                    description={
                      <EuiTextColor color="default">
                        <span>
                          {i18n.translate(
                            'xpack.slo.burnRateRule.alertDetailsAppSection.burnRate.tresholdSubtitle',
                            {
                              defaultMessage: 'Alert when > {threshold}x',
                              values: {
                                threshold: numeral(actionGroupWindow!.burnRateThreshold).format(
                                  '0.[00]'
                                ),
                              },
                            }
                          )}
                        </span>
                      </EuiTextColor>
                    }
                  />
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiPanel>
          </EuiFlexItem>
          <EuiFlexItem grow={5}>
            <ErrorRateChart
              slo={slo}
              dataTimeRange={chartTimeRange}
              alertTimeRange={alertTimeRange}
              threshold={actionGroupWindow!.burnRateThreshold}
              variant="danger"
            />
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexGroup>
    </EuiPanel>
  );
}
