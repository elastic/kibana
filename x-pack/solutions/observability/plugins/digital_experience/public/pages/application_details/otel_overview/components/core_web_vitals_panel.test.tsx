/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { EuiProvider } from '@elastic/eui';
import { getCoreVitalsComponent } from '@kbn/observability-plugin/public';
import type { WebVitals } from '../../../../../common/types/applications';
import { CoreWebVitalsPanel } from './core_web_vitals_panel';

jest.mock('@kbn/observability-plugin/public', () => ({ getCoreVitalsComponent: jest.fn() }));

const mockedCoreVitals = jest.mocked(getCoreVitalsComponent);

const WEB_VITALS: WebVitals = {
  lcp: { p75Ms: 2412.5, sampleCount: 10, ratings: { good: 0.8, needsImprovement: 0.1, poor: 0.1 } },
  inp: { p75Ms: 180.25, sampleCount: 4, ratings: { good: 1, needsImprovement: 0, poor: 0 } },
  cls: { p75: 0.045, sampleCount: 4, ratings: { good: 1, needsImprovement: 0, poor: 0 } },
  fcp: { p75Ms: 1650.5, sampleCount: 10, ratings: { good: 1, needsImprovement: 0, poor: 0 } },
  ttfb: { p75Ms: 950.25, sampleCount: 10, ratings: { good: 0, needsImprovement: 1, poor: 0 } },
};

const renderPanel = (webVitals = WEB_VITALS, isLoading = false) =>
  render(<CoreWebVitalsPanel webVitals={webVitals} isLoading={isLoading} />, {
    wrapper: EuiProvider,
  });

beforeEach(() => {
  mockedCoreVitals.mockReset();
  mockedCoreVitals.mockReturnValue(<div data-test-subj="coreVitals" />);
});

describe('CoreWebVitalsPanel', () => {
  it('passes the percentiles and rating percentages to the shared component', () => {
    renderPanel();

    expect(screen.getByTestId('coreVitals')).toBeInTheDocument();
    expect(mockedCoreVitals).toHaveBeenCalledWith({
      loading: false,
      data: {
        lcp: 2412.5,
        lcpRanks: [80, 10, 10],
        inp: 180.25,
        inpRanks: [100, 0, 0],
        cls: 0.045,
        clsRanks: [100, 0, 0],
      },
      // The vital samples are not page views, so the traffic share is not shown.
      displayTrafficMetric: false,
    });
  });

  it('passes no data while loading, so another selection is never shown as this one', () => {
    renderPanel(WEB_VITALS, true);

    expect(mockedCoreVitals).toHaveBeenCalledWith(
      expect.objectContaining({ loading: true, data: null })
    );
  });

  it('shows FCP and TTFB as p75 stats', () => {
    renderPanel();

    expect(screen.getByTestId('digitalExperienceOverviewFcp')).toHaveTextContent('1.65 s');
    expect(screen.getByTestId('digitalExperienceOverviewFcp')).toHaveTextContent('FCP (p75)');
    expect(screen.getByTestId('digitalExperienceOverviewTtfb')).toHaveTextContent('950 ms');
  });

  it('shows a dash for FCP and TTFB without samples', () => {
    const noVital = { p75Ms: null, sampleCount: 0, ratings: null };
    renderPanel({ ...WEB_VITALS, fcp: noVital, ttfb: noVital });

    expect(screen.getByTestId('digitalExperienceOverviewFcp')).toHaveTextContent('—');
    expect(screen.getByTestId('digitalExperienceOverviewTtfb')).toHaveTextContent('—');
  });
});
