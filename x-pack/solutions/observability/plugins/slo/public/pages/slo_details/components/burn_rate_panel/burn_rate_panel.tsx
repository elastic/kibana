/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButtonGroup, EuiFlexGroup, EuiFlexItem, EuiPanel, EuiTitle } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { SLOWithSummaryResponse } from '@kbn/slo-schema';
import moment from 'moment';
import React, { useEffect, useState } from 'react';
import { ErrorRateChart } from '../../../../components/slo/error_rate_chart';
import { useFetchSloBurnRates } from '../../../../hooks/use_fetch_slo_burn_rates';
import { BurnRateWindow, useFetchBurnRateWindows } from '../../hooks/use_fetch_burn_rate_windows';
import { BurnRateStatus } from './burn_rate_status';
import { getStatus } from './utils';

interface Props {
  slo: SLOWithSummaryResponse;
  isAutoRefreshing?: boolean;
}

export function BurnRatePanel({ slo, isAutoRefreshing }: Props) {
  const burnRateWindows = useFetchBurnRateWindows(slo);
  const [selectedWindow, setSelectedwindow] = useState(burnRateWindows[0]);
  const { isLoading, data } = useFetchSloBurnRates({
    slo,
    shouldRefetch: isAutoRefreshing,
    windows: toPayload(burnRateWindows),
  });

  useEffect(() => {
    if (burnRateWindows.length > 0) {
      setSelectedwindow(burnRateWindows[0]);
    }
  }, [burnRateWindows]);

  const onBurnRateOptionChange = (windowName: string) => {
    const selected = burnRateWindows.find((opt) => opt.name === windowName) ?? burnRateWindows[0];
    setSelectedwindow(selected);
  };

  const threshold = selectedWindow.threshold;
  const longWindowBurnRate =
    data?.burnRates.find((curr) => curr.name === longWindowName(selectedWindow.name))?.burnRate ??
    0;
  const shortWindowbBurnRate =
    data?.burnRates.find((curr) => curr.name === shortWindowName(selectedWindow.name))?.burnRate ??
    0;

  const currentStatus = getStatus(threshold, longWindowBurnRate, shortWindowbBurnRate);

  return (
    <EuiPanel paddingSize="m" color="transparent" hasBorder data-test-subj="burnRatePanel">
      <EuiFlexGroup direction="column" gutterSize="m">
        <EuiFlexGroup justifyContent="spaceBetween">
          <EuiFlexItem grow={false}>
            <EuiTitle size="xs">
              <h2>
                {i18n.translate('xpack.slo.burnRates.burnRatePanelTitle', {
                  defaultMessage: 'Burn rate',
                })}
              </h2>
            </EuiTitle>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButtonGroup
              legend={i18n.translate('xpack.slo.burnRate.timeRangeBtnLegend', {
                defaultMessage: 'Select the time range',
              })}
              options={burnRateWindows.map((burnRateWindow) => ({
                id: burnRateWindow.name,
                label: burnRateWindowLabel(burnRateWindow),
                'aria-label': burnRateWindowLabel(burnRateWindow),
              }))}
              idSelected={selectedWindow.name}
              onChange={onBurnRateOptionChange}
              buttonSize="compressed"
            />
          </EuiFlexItem>
        </EuiFlexGroup>
        <EuiFlexGroup direction="row" gutterSize="m">
          <EuiFlexItem grow={1}>
            <BurnRateStatus
              selectedWindow={selectedWindow}
              shortWindowBurnRate={shortWindowbBurnRate}
              longWindowBurnRate={longWindowBurnRate}
              isLoading={isLoading}
            />
          </EuiFlexItem>

          <EuiFlexItem grow={3}>
            <ErrorRateChart
              slo={slo}
              dataTimeRange={{
                from: moment()
                  .subtract(selectedWindow.longWindow.value, selectedWindow.longWindow.unit)
                  .toDate(),
                to: new Date(),
              }}
              threshold={threshold}
              variant={currentStatus === 'BREACHED' ? 'danger' : 'success'}
            />
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexGroup>
    </EuiPanel>
  );
}

const burnRateWindowLabel = (option: BurnRateWindow) =>
  i18n.translate('xpack.slo.burnRates.optionLabel', {
    defaultMessage: '{duration, plural, one {# hour} other {# hours}}',
    values: { duration: option.longWindow.value },
  });

const longWindowName = (window: string) => `${window}_LONG`;
const shortWindowName = (window: string) => `${window}_SHORT`;
const toPayload = (
  burnRateWindows: BurnRateWindow[]
): Array<{ name: string; duration: string }> => {
  return burnRateWindows.flatMap((window) => [
    {
      name: longWindowName(window.name),
      duration: `${window.longWindow.value}${window.longWindow.unit}`,
    },
    {
      name: shortWindowName(window.name),
      duration: `${window.shortWindow.value}${window.shortWindow.unit}`,
    },
  ]);
};
