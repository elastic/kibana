/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButtonGroup, EuiFlexGroup, EuiFlexItem, EuiPanel, EuiTitle } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';
import { ErrorRateChart } from '../../../../components/slo/error_rate_chart';
import { BurnRateStatus } from './burn_rate_status';
import { burnRateWindowLabel } from './utils';
import { useBurnRatePanel } from './hooks/use_burn_rate_panel';
import { useSloDetailsContext } from '../slo_details_context';

export function BurnRatePagePanel() {
  const { slo } = useSloDetailsContext();
  const {
    burnRateWindows,
    selectedWindow,
    onBurnRateOptionChange,
    longWindowBurnRate,
    shortWindowBurnRate,
    isLoading,
    threshold,
    currentStatus,
    dataTimeRange,
  } = useBurnRatePanel();

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
              shortWindowBurnRate={shortWindowBurnRate}
              longWindowBurnRate={longWindowBurnRate}
              isLoading={isLoading}
            />
          </EuiFlexItem>

          <EuiFlexItem grow={3}>
            <ErrorRateChart
              slo={slo}
              dataTimeRange={dataTimeRange}
              threshold={threshold}
              variant={currentStatus === 'BREACHED' ? 'danger' : 'success'}
            />
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexGroup>
    </EuiPanel>
  );
}
