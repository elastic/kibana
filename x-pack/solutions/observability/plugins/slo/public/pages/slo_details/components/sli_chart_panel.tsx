/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiButtonIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLink,
  EuiPanel,
  EuiStat,
  EuiText,
  EuiTitle,
  EuiToolTip,
} from '@elastic/eui';
import { css } from '@emotion/react';
import numeral from '@elastic/numeral';
import { i18n } from '@kbn/i18n';
import type {
  APMTransactionDurationIndicator,
  APMTransactionErrorRateIndicator,
  SLOWithSummaryResponse,
} from '@kbn/slo-schema';
import { rollingTimeWindowTypeSchema } from '@kbn/slo-schema';
import React from 'react';
import { useKibana } from '../../../hooks/use_kibana';
import { useFetchApmTracesIndex } from '../../../hooks/use_fetch_apm_indices';
import { convertSliApmParamsToApmAppDeeplinkUrl } from '../../../utils/slo/convert_sli_apm_params_to_apm_app_deeplink_url';
import { isApmIndicatorType } from '../../../utils/slo/indicator';
import type { ChartData } from '../../../typings/slo';
import { getSloChartState, isSloFailed } from '../utils/is_slo_failed';
import { toDurationAdverbLabel, toDurationLabel } from '../../../utils/slo/labels';
import { getApmTracesDiscoverUrl } from '../utils/discover_links/get_discover_link';
import type { TimeBounds } from '../types';
import { WideChart } from './wide_chart';

const linkStyle = css`
  height: 24px;
  display: inline-flex;
  align-items: center;
`;

export interface Props {
  data: ChartData[];
  isLoading: boolean;
  slo: SLOWithSummaryResponse;
  onBrushed?: (timeBounds: TimeBounds) => void;
  hideHeaderDurationLabel?: boolean;
}

const viewInApmLabel = i18n.translate('xpack.slo.sloDetails.sliHistoryChartPanel.viewInApm', {
  defaultMessage: 'View in APM',
});

const openInDiscoverLabel = i18n.translate(
  'xpack.slo.sloDetails.sliHistoryChartPanel.openInDiscover',
  { defaultMessage: 'Open traces in Discover' }
);

export function SliChartPanel({
  data,
  isLoading,
  slo,
  onBrushed,
  hideHeaderDurationLabel = false,
}: Props) {
  const {
    uiSettings,
    share,
    http: { basePath },
    application: { capabilities },
  } = useKibana().services;
  const percentFormat = uiSettings.get('format:percent:defaultPattern');
  const isSloFailedStatus = isSloFailed(slo.summary.status);
  const observedValue = data.at(-1)?.value;

  const hasNoData = observedValue === undefined || observedValue < 0;

  const isApm = isApmIndicatorType(slo.indicator);
  const hasApmReadCapabilities = !!capabilities.apm.show;
  const isRemote = !!slo.remote;
  const canNavigateToApm = isApm && hasApmReadCapabilities && !isRemote;

  const apmUrl = isApm ? convertSliApmParamsToApmAppDeeplinkUrl(slo) : undefined;
  const apmLink = apmUrl ? basePath.prepend(apmUrl) : undefined;

  const { data: tracesIndex } = useFetchApmTracesIndex();

  const discoverLink = (() => {
    if (!isApm || !tracesIndex) return undefined;

    const indicator = slo.indicator as
      | APMTransactionDurationIndicator
      | APMTransactionErrorRateIndicator;
    const { params } = indicator;

    return getApmTracesDiscoverUrl({
      params: {
        index: tracesIndex,
        serviceName: String(slo.groupings?.['service.name'] ?? params.service),
        environment: String(slo.groupings?.['service.environment'] ?? params.environment),
        transactionType: String(slo.groupings?.['transaction.type'] ?? params.transactionType),
        transactionName: String(slo.groupings?.['transaction.name'] ?? params.transactionName),
      },
      share,
      timeRange: {
        from: `now-${slo.timeWindow.duration}`,
        to: 'now',
      },
    });
  })();

  return (
    <EuiPanel paddingSize="m" color="transparent" hasBorder data-test-subj="sliChartPanel">
      <EuiFlexGroup direction="column" gutterSize="l">
        <EuiFlexGroup>
          <EuiFlexGroup direction="column" gutterSize="none">
            <EuiFlexItem>
              <EuiTitle size="xs">
                <h2>
                  {i18n.translate('xpack.slo.sloDetails.sliHistoryChartPanel.title', {
                    defaultMessage: 'Historical SLI',
                  })}
                </h2>
              </EuiTitle>
            </EuiFlexItem>
            {!hideHeaderDurationLabel && (
              <EuiFlexItem>
                <EuiText color="subdued" size="s">
                  {rollingTimeWindowTypeSchema.is(slo.timeWindow.type)
                    ? i18n.translate('xpack.slo.sloDetails.sliHistoryChartPanel.duration', {
                        defaultMessage: 'Last {duration}',
                        values: { duration: toDurationLabel(slo.timeWindow.duration) },
                      })
                    : toDurationAdverbLabel(slo.timeWindow.duration)}
                </EuiText>
              </EuiFlexItem>
            )}
          </EuiFlexGroup>
          <EuiFlexItem grow={0}>
            <EuiFlexGroup gutterSize="m" responsive={false}>
              {canNavigateToApm && apmLink && (
                <EuiFlexItem grow={false}>
                  <EuiLink
                    css={linkStyle}
                    href={apmLink}
                    data-test-subj="slidHistoryChartViewInApmLink"
                  >
                    {viewInApmLabel}
                  </EuiLink>
                </EuiFlexItem>
              )}
              {discoverLink && (
                <EuiFlexItem grow={false}>
                  <EuiToolTip content={openInDiscoverLabel} disableScreenReaderOutput>
                    <EuiButtonIcon
                      data-test-subj="slidHistoryChartOpenInDiscoverLink"
                      aria-label={openInDiscoverLabel}
                      iconType="discoverApp"
                      href={discoverLink}
                    />
                  </EuiToolTip>
                </EuiFlexItem>
              )}
            </EuiFlexGroup>
          </EuiFlexItem>
        </EuiFlexGroup>
        <EuiFlexGroup direction="row" gutterSize="l" alignItems="flexStart" responsive={false}>
          <EuiFlexItem grow={false}>
            <EuiStat
              titleColor={isSloFailedStatus ? 'danger' : 'success'}
              title={hasNoData ? '-' : numeral(observedValue).format(percentFormat)}
              titleSize="s"
              description={i18n.translate('xpack.slo.sloDetails.sliHistoryChartPanel.current', {
                defaultMessage: 'Observed value',
              })}
              reverse
            />
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiStat
              title={numeral(slo.objective.target).format(percentFormat)}
              titleSize="s"
              description={i18n.translate('xpack.slo.sloDetails.sliHistoryChartPanel.objective', {
                defaultMessage: 'Objective',
              })}
              reverse
            />
          </EuiFlexItem>
        </EuiFlexGroup>

        <EuiFlexItem>
          <WideChart
            chart="line"
            id={i18n.translate('xpack.slo.sloDetails.sliHistoryChartPanel.chartTitle', {
              defaultMessage: 'SLI value',
            })}
            state={getSloChartState(slo.summary.status)}
            data={data}
            isLoading={isLoading}
            onBrushed={onBrushed}
            slo={slo}
          />
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiPanel>
  );
}
