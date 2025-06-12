/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { HistoricalSummaryResponse } from '@kbn/slo-schema';
import { KibanaReactStorybookDecorator } from '../../../utils/kibana_react.storybook_decorator';
import {
  DEGRADING_FAST_ROLLING_SLO,
  HEALTHY_RANDOM_ROLLING_SLO,
  HEALTHY_ROLLING_SLO,
  HEALTHY_STEP_DOWN_ROLLING_SLO,
  historicalSummaryData,
  NO_DATA_TO_HEALTHY_ROLLING_SLO,
} from '../../../data/slo/historical_summary_data';
import { SloSparkline as Component } from './slo_sparkline';

export default {
  component: Component,
  title: 'app/SLO/ListPage/SloSparkline',
  decorators: [KibanaReactStorybookDecorator],
};

export const AreaWithHealthyFlatData = {
  args: {
    chart: 'area',
    state: 'success',
    id: 'history',
    data: toBudgetBurnDown(
      historicalSummaryData.find((datum) => datum.sloId === HEALTHY_ROLLING_SLO)!.data
    ),
  },
};

export const AreaWithHealthyRandomData = {
  args: {
    chart: 'area',
    state: 'success',
    id: 'history',
    data: toBudgetBurnDown(
      historicalSummaryData.find((datum) => datum.sloId === HEALTHY_RANDOM_ROLLING_SLO)!.data
    ),
  },
};

export const AreaWithHealthyStepDownData = {
  args: {
    chart: 'area',
    state: 'success',
    id: 'history',
    data: toBudgetBurnDown(
      historicalSummaryData.find((datum) => datum.sloId === HEALTHY_STEP_DOWN_ROLLING_SLO)!.data
    ),
  },
};

export const AreaWithDegradingLinearData = {
  args: {
    chart: 'area',
    state: 'error',
    id: 'history',
    data: toBudgetBurnDown(
      historicalSummaryData.find((datum) => datum.sloId === DEGRADING_FAST_ROLLING_SLO)!.data
    ),
  },
};

export const AreaWithNoDataToDegradingLinearData = {
  args: {
    chart: 'area',
    state: 'error',
    id: 'history',
    data: toBudgetBurnDown(
      historicalSummaryData.find((datum) => datum.sloId === NO_DATA_TO_HEALTHY_ROLLING_SLO)!.data
    ),
  },
};

export const LineWithHealthyFlatData = {
  args: {
    chart: 'line',
    state: 'success',
    id: 'history',
    data: toSliHistory(
      historicalSummaryData.find((datum) => datum.sloId === HEALTHY_ROLLING_SLO)!.data
    ),
  },
};

export const LineWithHealthyRandomData = {
  args: {
    chart: 'line',
    state: 'success',
    id: 'history',
    data: toSliHistory(
      historicalSummaryData.find((datum) => datum.sloId === HEALTHY_RANDOM_ROLLING_SLO)!.data
    ),
  },
};

export const LineWithHealthyStepDownData = {
  args: {
    chart: 'line',
    state: 'success',
    id: 'history',
    data: toSliHistory(
      historicalSummaryData.find((datum) => datum.sloId === HEALTHY_STEP_DOWN_ROLLING_SLO)!.data
    ),
  },
};

export const LineWithDegradingLinearData = {
  args: {
    chart: 'line',
    state: 'error',
    id: 'history',
    data: toSliHistory(
      historicalSummaryData.find((datum) => datum.sloId === DEGRADING_FAST_ROLLING_SLO)!.data
    ),
  },
};

export const LineWithNoDataToDegradingLinearData = {
  args: {
    chart: 'line',
    state: 'error',
    id: 'history',
    data: toSliHistory(
      historicalSummaryData.find((datum) => datum.sloId === NO_DATA_TO_HEALTHY_ROLLING_SLO)!.data
    ),
  },
};

function toBudgetBurnDown(data: HistoricalSummaryResponse[]) {
  return data.map((datum) => ({
    key: new Date(datum.date).getTime(),
    value: datum.status === 'NO_DATA' ? undefined : datum.errorBudget.remaining,
  }));
}

function toSliHistory(data: HistoricalSummaryResponse[]) {
  return data.map((datum) => ({
    key: new Date(datum.date).getTime(),
    value: datum.status === 'NO_DATA' ? undefined : datum.sliValue,
  }));
}
