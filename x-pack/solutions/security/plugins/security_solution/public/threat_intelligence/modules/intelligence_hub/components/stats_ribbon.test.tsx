/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';
import type { DashboardOverviewResponse } from '../../../../../common/threat_intelligence/hub';
import { StatsRibbon } from './intelligence_hub_dashboard';

const baseStats: DashboardOverviewResponse['stats_ribbon'] = {
  total_reports: 8,
  critical_reports: 1,
  high_reports: 2,
  medium_reports: 3,
  low_reports: 2,
  affects_you_total: 0,
  distinct_source_count: 4,
  total_reports_prior: 7,
  critical_reports_prior: 1,
  distinct_source_count_prior: 0,
};

const renderRibbon = (stats: DashboardOverviewResponse['stats_ribbon'] = baseStats) =>
  render(
    <I18nProvider>
      <StatsRibbon stats={stats} topCategory="cloud-security" />
    </I18nProvider>
  );

describe('StatsRibbon prior period', () => {
  it('shows percent increase for articles vs prior period', () => {
    renderRibbon();
    expect(screen.getByText('14% vs prior period')).toBeInTheDocument();
  });

  it('shows flat 0% when critical count is unchanged', () => {
    renderRibbon();
    expect(screen.getByText('0% vs prior period')).toBeInTheDocument();
  });

  it('shows 100% when sources grow from an empty prior window', () => {
    renderRibbon();
    // distinct_source_count 4 vs prior 0 → 100%
    expect(screen.getByText('100% vs prior period')).toBeInTheDocument();
  });

  it('shows percent decrease with absolute percent value and down arrow', () => {
    renderRibbon({
      ...baseStats,
      total_reports: 5,
      total_reports_prior: 10,
      critical_reports: 1,
      critical_reports_prior: 1,
      distinct_source_count_prior: 4,
    });
    expect(screen.getByText('50% vs prior period')).toBeInTheDocument();
    expect(document.querySelector('[data-euiicon-type="arrowDown"]')).not.toBeNull();
  });
});
