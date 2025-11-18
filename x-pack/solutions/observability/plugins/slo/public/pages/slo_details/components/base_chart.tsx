/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexItem } from '@elastic/eui';
import React, { type ReactNode } from 'react';
import type { SLOWithSummaryResponse } from '@kbn/slo-schema';
import type { ChartData } from '../../../typings/slo';
import type { TimeBounds } from '../types';
import { WideChart } from './wide_chart';

type ChartType = 'area' | 'line';
type State = 'success' | 'error';

export interface BaseChartProps {
  data: ChartData[];
  isLoading: boolean;
  slo: SLOWithSummaryResponse;
  hideMetadata?: boolean;
  onBrushed?: (timeBounds: TimeBounds) => void;
  chartType: ChartType;
  chartId: string;
  metadata?: ReactNode;
}

export function BaseChart({
  data,
  isLoading,
  slo,
  hideMetadata = false,
  chartType,
  chartId,
  metadata,
  onBrushed,
}: BaseChartProps) {
  const isSloFailed = slo.summary.status === 'DEGRADING' || slo.summary.status === 'VIOLATED';
  const state: State = isSloFailed ? 'error' : 'success';

  return (
    <>
      {!hideMetadata && metadata}

      <EuiFlexItem>
        <WideChart
          chart={chartType}
          id={chartId}
          state={state}
          data={data}
          isLoading={isLoading}
          onBrushed={onBrushed}
          slo={slo}
        />
      </EuiFlexItem>
    </>
  );
}
