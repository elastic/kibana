/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiThemeProvider } from '@elastic/eui';
import { render, screen } from '@testing-library/react';
import { useAnalyticsClusterState } from '../../hooks/use_analytics_cluster_state';
import { useAnalyticsLinks } from '../../hooks/use_analytics_links';
import { useAnalyticsPreferences } from '../../hooks/use_analytics_preferences';
import { useEventsOverTime } from '../../hooks/use_events_over_time';
import { useSampleData } from '../../hooks/use_sample_data';
import type { AnalyticsClusterStateResult } from '../../types';
import {
  HAS_DATA_STATE,
  NO_DATA_STATE,
  SEARCH_STATE,
  createClusterStateResult,
  createLinksMock,
} from '../shared/test_helpers';
import { UnifiedHomePage } from './unified_home';

jest.mock('../../../hooks/use_kibana', () => ({
  useKibana: () => ({ services: { notifications: { toasts: { addSuccess: jest.fn() } } } }),
}));
jest.mock('../../../components/search_homepage/search_homepage', () => ({
  SearchHomepagePage: () => <div data-test-subj="elasticsearchHomePage" />,
}));
jest.mock('../../hooks/use_analytics_cluster_state');
jest.mock('../../hooks/use_chrome_hidden');
jest.mock('../shared/connection_details', () => ({
  ConnectionDetails: () => <div data-test-subj="connectionDetailsStub" />,
}));
jest.mock('../../hooks/use_analytics_links');
jest.mock('../../hooks/use_analytics_preferences');
jest.mock('../../hooks/use_sample_data');
jest.mock('../../hooks/use_events_over_time');
jest.mock('../../hooks/use_source_generation');
jest.mock('../analytics_page_template', () => ({
  AnalyticsPageTemplate: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

const mockUseAnalyticsClusterState = jest.mocked(useAnalyticsClusterState);

const Page = () => (
  <EuiThemeProvider>
    <UnifiedHomePage />
  </EuiThemeProvider>
);

// Unlike the other home tests, these load each journey's views the way the app does.
describe('UnifiedHomePage view loading', () => {
  const show = (
    result: AnalyticsClusterStateResult,
    rerender?: (ui: React.ReactElement) => void
  ) => {
    mockUseAnalyticsClusterState.mockReturnValue(result);
    return rerender ? rerender(<Page />) : render(<Page />).rerender;
  };

  beforeEach(() => {
    jest.mocked(useAnalyticsLinks).mockReturnValue(createLinksMock());
    jest.mocked(useEventsOverTime).mockReturnValue({
      data: undefined,
      isLoading: false,
      hasFailed: false,
      reportFailure: jest.fn(),
    });
    jest.mocked(useSampleData).mockReturnValue({ isInstalling: false, install: jest.fn() });
    jest.mocked(useAnalyticsPreferences).mockReturnValue({
      selectedUseCaseId: undefined,
      selectUseCase: jest.fn(),
      preferredJourney: undefined,
      setPreferredJourney: jest.fn(),
    });
  });

  it('loads the gate, then the search home when search data arrives', async () => {
    const rerender = show(createClusterStateResult(NO_DATA_STATE));

    expect(await screen.findByTestId('analyticsHomeIngestGate')).toBeInTheDocument();
    expect(screen.queryByTestId('elasticsearchHomePage')).not.toBeInTheDocument();

    show(createClusterStateResult(SEARCH_STATE), rerender ?? undefined);

    expect(await screen.findByTestId('elasticsearchHomePage')).toBeInTheDocument();
    expect(screen.queryByTestId('analyticsHomeIngestGate')).not.toBeInTheDocument();
  });

  it('loads the analytics home when events arrive, and moves focus to its heading', async () => {
    const rerender = show(createClusterStateResult(NO_DATA_STATE));
    await screen.findByTestId('analyticsHomeIngestGate');

    show(createClusterStateResult(HAS_DATA_STATE), rerender ?? undefined);

    expect(await screen.findByTestId('analyticsHomeHasData')).toBeInTheDocument();
    expect(screen.getByTestId('analyticsHomeEventsDetected')).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 1 })).toHaveFocus();
    expect(screen.queryByTestId('elasticsearchHomePage')).not.toBeInTheDocument();
  });
});
