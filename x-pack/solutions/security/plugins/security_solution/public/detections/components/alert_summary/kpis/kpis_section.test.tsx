/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';
import type { Mock } from 'vitest';

import React from 'react';
import { render } from '@testing-library/react';
import { KPIsSection } from './kpis_section';
import { ALERTS_BY_HOST_PANEL } from './alerts_progress_bar_by_host_name_panel';
import { TestProviders } from '../../../../common/mock';
import { useDeepEqualSelector } from '../../../../common/hooks/use_selector';
import { useSummaryChartData } from '../../alerts_kpis/alerts_summary_charts_panel/use_summary_chart_data';

vi.mock('../../../../common/hooks/use_selector');
vi.mock('../../alerts_kpis/alerts_summary_charts_panel/use_summary_chart_data');

describe('<KPIsSection />', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (useSummaryChartData as Mock).mockReturnValue({
      items: [],
      isLoading: false,
    });
  });

  it('should render all components', () => {
    (useDeepEqualSelector as Mock).mockReturnValue({
      meta: {},
    });

    const { getByTestId } = render(
      <TestProviders>
        <KPIsSection signalIndexName="test" />
      </TestProviders>
    );

    expect(getByTestId('severty-level-panel')).toBeInTheDocument();
    expect(getByTestId('alerts-by-rule-panel')).toBeInTheDocument();
    expect(getByTestId(ALERTS_BY_HOST_PANEL)).toBeInTheDocument();
  });
});
