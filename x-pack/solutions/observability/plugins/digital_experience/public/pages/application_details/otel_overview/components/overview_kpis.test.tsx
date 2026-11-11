/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { EuiProvider } from '@elastic/eui';
import type { OverviewPercentile } from '../../../../../common/overview_filters';
import type { ApplicationOverview } from '../../../../../common/types/overview';
import { useKibanaServices } from '../../../../hooks/use_kibana_services';
import { createUiSettingsMock } from '../../../../test_utils/ui_settings_mock';
import { OverviewKpis } from './overview_kpis';

jest.mock('../../../../hooks/use_kibana_services');

const NO_VITAL = { p75Ms: null, sampleCount: 0, ratings: null };

const OVERVIEW: ApplicationOverview = {
  serviceName: 'shop',
  percentile: 75,
  pageLoads: { count: 1533 },
  loadTime: { percentileMs: 2412.5, sampleCount: 1500 },
  jsErrors: { count: 42 },
  httpRequests: { count: 400, failedCount: 50, failedRatio: 0.125 },
  webVitals: {
    lcp: NO_VITAL,
    inp: NO_VITAL,
    cls: { p75: null, sampleCount: 0, ratings: null },
    fcp: NO_VITAL,
    ttfb: NO_VITAL,
  },
  trend: [],
};

const renderKpis = (overview = OVERVIEW, isLoading = false, percentile: OverviewPercentile = 75) =>
  render(<OverviewKpis overview={overview} percentile={percentile} isLoading={isLoading} />, {
    wrapper: EuiProvider,
  });

const kpi = (name: string) => screen.getByTestId(`digitalExperienceOverview${name}`);

beforeEach(() => {
  jest.mocked(useKibanaServices).mockReturnValue({
    uiSettings: createUiSettingsMock(),
  } as unknown as ReturnType<typeof useKibanaServices>);
});

describe('OverviewKpis', () => {
  it('shows the four metrics with their units', () => {
    renderKpis();

    expect(kpi('PageLoads')).toHaveTextContent('1,533');
    expect(kpi('LoadTime')).toHaveTextContent('2.41 s');
    expect(kpi('LoadTime')).toHaveTextContent('Load time (p75)');
    expect(kpi('JsErrors')).toHaveTextContent('42');
    expect(kpi('FailedHttp')).toHaveTextContent('12.5%');
  });

  it('names the percentile the load time is at', () => {
    renderKpis(OVERVIEW, false, 95);

    expect(kpi('LoadTime')).toHaveTextContent('Load time (p95)');
  });

  it('shows a load time under a second in milliseconds', () => {
    renderKpis({ ...OVERVIEW, loadTime: { percentileMs: 950.25, sampleCount: 1 } });

    expect(kpi('LoadTime')).toHaveTextContent('950 ms');
  });

  it('shows a dash where nothing was measured, not a zero', () => {
    renderKpis({
      ...OVERVIEW,
      loadTime: { percentileMs: null, sampleCount: 0 },
      httpRequests: { count: 0, failedCount: 0, failedRatio: null },
    });

    expect(kpi('LoadTime')).toHaveTextContent('—');
    expect(kpi('FailedHttp')).toHaveTextContent('—');
  });

  it('shows no values while loading', () => {
    renderKpis(OVERVIEW, true);

    expect(screen.queryByText('1,533')).not.toBeInTheDocument();
    expect(screen.queryByText('2.41 s')).not.toBeInTheDocument();
  });
});
