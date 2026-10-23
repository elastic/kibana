/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiProvider } from '@elastic/eui';
import { I18nProvider } from '@kbn/i18n-react';
import { render, screen } from '@testing-library/react';
import { createMemoryHistory } from 'history';
import React from 'react';
import { Router } from '@kbn/shared-ux-router';
import { useDetectionOverview } from '../../data/detection_overview/use_detection_overview';
import { useMaintenanceStatus } from '../../data/maintenance/use_significant_events_maintenance';
import { DetectionPage } from './page';

jest.mock('../../app/app_header', () => ({
  NightshiftAppHeader: () => <div data-test-subj="nightshiftAppHeaderStub" />,
}));
jest.mock('../../data/detection_overview/use_detection_overview');
jest.mock('../../data/maintenance/use_significant_events_maintenance');
jest.mock('./events/events_tab', () => ({
  EventsTab: () => <div data-test-subj="eventsTabStub" />,
}));
jest.mock('../../hooks/use_kibana', () => ({
  useKibana: () => ({
    services: {
      application: {
        getUrlForApp: () => '/app/nightshift/',
      },
    },
  }),
}));

const mockUseDetectionOverview = useDetectionOverview as jest.Mock;
const mockUseMaintenanceStatus = useMaintenanceStatus as jest.Mock;
const refetch = jest.fn();

const renderPage = (initialPath = '/detections/events') =>
  render(
    <I18nProvider>
      <EuiProvider>
        <Router history={createMemoryHistory({ initialEntries: [initialPath] })}>
          <DetectionPage headerProps={{}} tab="events" />
        </Router>
      </EuiProvider>
    </I18nProvider>
  );

describe('DetectionPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseMaintenanceStatus.mockReturnValue({
      data: { state: 'paused' },
      isLoading: false,
      isError: false,
    });
    mockUseDetectionOverview.mockReturnValue({
      data: {
        sources: 6,
        knowledge_indicators: 113,
        active_rules: 80,
        detections: 40,
        significant_events: 23,
      },
      isLoading: false,
      isError: false,
      refetch,
    });
  });

  it('shows the paused detection process status', async () => {
    renderPage();

    expect(await screen.findByTestId('eventsTabStub')).toBeInTheDocument();
    expect(screen.getByTestId('nightshiftDetectionStatus')).toHaveTextContent('Paused');
    expect(screen.getByText('knowledge indicators')).toBeInTheDocument();
    expect(screen.getByText('detections')).toBeInTheDocument();
  });

  it('shows the overview error instead of zero counts', async () => {
    mockUseDetectionOverview.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
      refetch,
    });

    renderPage();

    expect(await screen.findByTestId('eventsTabStub')).toBeInTheDocument();
    expect(screen.getByTestId('nightshiftDetectionOverviewError')).toBeInTheDocument();
    expect(screen.queryByText('0')).not.toBeInTheDocument();
    expect(screen.queryByTestId('nightshiftDetectionOverviewSources')).not.toBeInTheDocument();
  });

  it('falls back to the default time range when the URL range is malformed', async () => {
    renderPage('/detections/events?rangeFrom=now-5zz&rangeTo=now');

    expect(await screen.findByTestId('eventsTabStub')).toBeInTheDocument();
    expect(mockUseDetectionOverview).toHaveBeenLastCalledWith({ from: 'now-24h', to: 'now' });
  });
});
