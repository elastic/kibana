/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiProvider } from '@elastic/eui';
import { I18nProvider } from '@kbn/i18n-react';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { useDetectionOverview } from '../../data/detection_overview/use_detection_overview';
import { useMaintenanceStatus } from '../../data/maintenance/use_significant_events_maintenance';
import { DetectionPage } from './page';

jest.mock('../../app/app_header', () => ({
  NightshiftAppHeader: () => <div data-test-subj="nightshiftAppHeaderStub" />,
}));
jest.mock('../../data/detection_overview/use_detection_overview');
jest.mock('../../data/maintenance/use_significant_events_maintenance');
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

const renderPage = () =>
  render(
    <I18nProvider>
      <EuiProvider>
        <DetectionPage headerProps={{}} />
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

  it('shows the paused detection process status', () => {
    renderPage();

    expect(screen.getByTestId('nightshiftDetectionStatus')).toHaveTextContent('Paused');
    expect(screen.getByText('Knowledge indicators')).toBeInTheDocument();
  });

  it('shows the overview error instead of zero counts', () => {
    mockUseDetectionOverview.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
      refetch,
    });

    renderPage();

    expect(screen.getByTestId('nightshiftDetectionOverviewError')).toBeInTheDocument();
    expect(screen.queryByText('0')).not.toBeInTheDocument();
    expect(screen.queryByTestId('nightshiftDetectionOverviewSources')).not.toBeInTheDocument();
  });
});
