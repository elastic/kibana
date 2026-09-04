/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ERROR_STATES_KQL, getSyntheticsSingleMetricConfig } from './single_metric_config';
import { getSyntheticsKPIConfig } from './kpi_over_time_config';
import type { MetricOption } from '../../types';

const mockDataView = { fields: [] } as any;

const metricById = (options: Array<{ id: string }> | undefined, id: string) =>
  options?.find((option) => option.id === id) as MetricOption | undefined;

describe('synthetics error states metrics', () => {
  it('counts unique down states on summary docs, excluding run-once', () => {
    expect(ERROR_STATES_KQL).toContain('summary: *');
    expect(ERROR_STATES_KQL).toContain('not run_once: *');
    expect(ERROR_STATES_KQL).toContain('monitor.status: "down"');
    expect(ERROR_STATES_KQL).toContain('state.up: 0');
  });

  it('uses ERROR_STATES_KQL for the monitor_errors single metric', () => {
    const config = getSyntheticsSingleMetricConfig({ dataView: mockDataView });
    const metric = metricById(config.metricOptions, 'monitor_errors');

    expect(metric?.formula).toBe(`unique_count(state.id, kql='${ERROR_STATES_KQL}')`);
    expect(metric?.label).toBe('Error states');
  });

  it('uses ERROR_STATES_KQL for the monitor_errors KPI sparkline', () => {
    const config = getSyntheticsKPIConfig({ dataView: mockDataView });
    const metric = metricById(config.metricOptions, 'monitor_errors');

    expect(metric?.columnFilters?.[0].query).toBe(ERROR_STATES_KQL);
    expect(metric?.label).toBe('Error states');
  });

  it('exposes monitor_failed_tests on the KPI config for History sparklines', () => {
    const config = getSyntheticsKPIConfig({ dataView: mockDataView });
    const metric = metricById(config.metricOptions, 'monitor_failed_tests');

    expect(metric).toBeDefined();
    expect(metric?.columnFilters?.[0].query).toBe('summary.status: down');
  });
});
