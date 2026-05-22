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

const renderKpiCharts = () =>
  render(
    <I18nProvider>
      <KpiCharts />
    </I18nProvider>
  );

describe('KpiCharts', () => {
  it('renders the new endpoint-backed KPI tiles', () => {
    renderKpiCharts();
    expect(screen.getByTestId('hostKpiTiles')).toBeInTheDocument();
  });
});
