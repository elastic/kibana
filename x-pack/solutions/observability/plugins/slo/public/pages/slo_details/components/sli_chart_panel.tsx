/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem, EuiPanel, EuiText, EuiTitle } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { SLOWithSummaryResponse } from '@kbn/slo-schema';
import { rollingTimeWindowTypeSchema } from '@kbn/slo-schema';
import React from 'react';
import type { ChartData } from '../../../typings/slo';
import { toDurationAdverbLabel, toDurationLabel } from '../../../utils/slo/labels';
import type { TimeBounds } from '../types';
import { SliChart } from './sli_chart';

export interface Props {
  data: ChartData[];
  isLoading: boolean;
  slo: SLOWithSummaryResponse;
  hideMetadata?: boolean;
  observedValue?: number;
  onBrushed?: (timeBounds: TimeBounds) => void;
}

export function SliChartPanel({
  data,
  isLoading,
  slo,
  hideMetadata = false,
  observedValue,
  onBrushed,
}: Props) {
  return (
    <EuiPanel paddingSize="m" color="transparent" hasBorder data-test-subj="sliChartPanel">
      <EuiFlexGroup direction="column" gutterSize="l">
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
          {!hideMetadata && (
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

        <SliChart
          data={data}
          isLoading={isLoading}
          slo={slo}
          hideMetadata={hideMetadata}
          observedValue={observedValue}
          onBrushed={onBrushed}
        />
      </EuiFlexGroup>
    </EuiPanel>
  );
}
