/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';
import { KpiCharts } from './kpi_charts';

// P15b — `KpiCharts` is now a thin wrapper around `<HostKpiTiles>` (which
// consumes the new `/api/metrics/infra/host/kpis` endpoint). The
// integration is exercised in `host_kpi_tiles.test.tsx`; here we just
// guarantee the wrapper still exports the component shape the consuming
// `<KPIGrid>` expects.
jest.mock('./host_kpi_tiles', () => ({
  HostKpiTiles: () => <div data-test-subj="hostKpiTiles">HostKpiTiles</div>,
}));
jest.mock('./legacy_kpi_charts', () => ({
  LegacyKpiCharts: () => <div data-test-subj="legacyKpiCharts">LegacyKpiCharts</div>,
}));

const mockUsePocSettingsContext = jest.fn();
jest.mock('../../hooks/use_poc_settings', () => ({
  usePocSettingsContext: () => mockUsePocSettingsContext(),
  pocFlags: {
    useKpiEndpoint: true,
    dropKpiTrendline: true,
    useTwoPhaseFetch: true,
    useServerSideSort: true,
    useScopedAlerts: true,
    useEsqlPhaseB: true,
    useMetricsTimeseriesEndpoint: true,
    useTermsFilter: true,
    useConsolidatedKql: true,
    useStrippedBoolWrap: true,
    useReadyGate: true,
  },
}));

const renderKpiCharts = () =>
  render(
    <I18nProvider>
      <KpiCharts />
    </I18nProvider>
  );

describe('KpiCharts', () => {
  afterEach(() => {
    mockUsePocSettingsContext.mockReset();
  });

  it('renders the new endpoint-backed KPI tiles when the PoC toggle is on', () => {
    mockUsePocSettingsContext.mockReturnValue({ useKpiEndpoint: true });
    renderKpiCharts();
    expect(screen.getByTestId('hostKpiTiles')).toBeInTheDocument();
    expect(screen.queryByTestId('legacyKpiCharts')).not.toBeInTheDocument();
  });

  it('renders the legacy Lens-backed KPI charts when the PoC toggle is off', () => {
    mockUsePocSettingsContext.mockReturnValue({ useKpiEndpoint: false });
    renderKpiCharts();
    expect(screen.getByTestId('legacyKpiCharts')).toBeInTheDocument();
    expect(screen.queryByTestId('hostKpiTiles')).not.toBeInTheDocument();
  });
});
