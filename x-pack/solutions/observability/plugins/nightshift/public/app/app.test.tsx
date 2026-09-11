/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { fireEvent, render, screen } from '@testing-library/react';
import { usePageReady } from '@kbn/ebt-tools';
import { I18nProvider } from '@kbn/i18n-react';
import type { ListInvestigationItem } from '@kbn/nightshift-investigations-plugin/common';
import React from 'react';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { NightshiftApp } from './app';
import { useFetchInvestigations } from '../hooks/use_fetch_investigations';
import { useKibana } from '../hooks/use_kibana';

jest.mock('../hooks/use_fetch_investigations');
jest.mock('../hooks/use_kibana');
jest.mock('@kbn/ebt-tools');

jest.mock('../investigation/investigation_list', () => ({
  INVESTIGATION_LIST_PAGE_SIZES: [20, 50, 100],
  InvestigationList: ({
    investigations,
    onInvestigationClick,
  }: {
    investigations: ListInvestigationItem[];
    onInvestigationClick: (investigation: ListInvestigationItem) => void;
  }) => (
    <button onClick={() => onInvestigationClick(investigations[0])} type="button">
      {investigations[0]?.summary ?? 'No investigations'}
    </button>
  ),
}));

jest.mock('../investigation/investigation_detail_flyout', () => ({
  InvestigationDetailFlyout: ({
    investigationId,
    onClose,
  }: {
    investigationId: string;
    onClose: () => void;
  }) => (
    <div>
      <span>{`Flyout: ${investigationId}`}</span>
      <button onClick={onClose} type="button">
        Close
      </button>
    </div>
  ),
}));

const mockUseFetchInvestigations = useFetchInvestigations as jest.Mock;
const mockUseKibana = useKibana as jest.Mock;
const mockUsePageReady = usePageReady as jest.Mock;

const investigation: ListInvestigationItem = {
  investigation_id: 'investigation-1',
  status: 'running',
  created_at: '2026-09-11T09:00:00.000Z',
  subject: { type: 'significant_event', id: 'event-1', summary: 'Investigate checkout errors' },
  summary: 'Checkout errors are elevated',
};

const refetch = jest.fn();

function setInvestigations({
  data = { results: [investigation], total: 1 },
  error = null,
  isFetching = false,
  isInitialLoading = false,
}: {
  data?: { results: ListInvestigationItem[]; total: number };
  error?: Error | null;
  isFetching?: boolean;
  isInitialLoading?: boolean;
} = {}) {
  mockUseFetchInvestigations.mockReturnValue({
    data,
    error,
    isFetching,
    isInitialLoading,
    refetch,
  });
}

function LocationProbe(): React.ReactElement {
  return <span data-test-subj="locationProbe">{useLocation().search}</span>;
}

function renderApp({ initialEntries = ['/'] }: { initialEntries?: string[] } = {}) {
  return render(
    <I18nProvider>
      <MemoryRouter initialEntries={initialEntries}>
        <NightshiftApp />
        <LocationProbe />
      </MemoryRouter>
    </I18nProvider>
  );
}

describe('NightshiftApp', () => {
  beforeEach(() => {
    refetch.mockClear();
    mockUsePageReady.mockClear();
    mockUseKibana.mockReturnValue({
      services: {
        application: {
          getUrlForApp: () => '/app/significant_events/significant_events',
        },
        nightshiftInvestigations: { investigationsClient: {} },
      },
    });
    setInvestigations();
  });

  it('renders investigations and reports the page ready metrics', () => {
    renderApp();

    expect(screen.getByText('Checkout errors are elevated')).toBeInTheDocument();
    expect(screen.getByText('Investigations are underway')).toBeInTheDocument();
    expect(mockUsePageReady).toHaveBeenCalledWith(
      expect.objectContaining({
        isReady: true,
        isRefreshing: false,
        customMetrics: expect.objectContaining({
          key1: 'investigation_count',
          value1: 1,
          key2: 'investigation_total',
          value2: 1,
          key3: 'active_investigation_count',
          value3: 1,
        }),
      })
    );
  });

  it('shows the unavailable callout and reports ready when the optional plugin is absent', () => {
    mockUseKibana.mockReturnValue({
      services: {
        application: { getUrlForApp: () => '/app/significant_events/significant_events' },
      },
    });
    setInvestigations({ data: undefined });

    renderApp();

    expect(
      screen.getByText('Investigations are not available in this deployment')
    ).toBeInTheDocument();
    expect(mockUsePageReady).toHaveBeenCalledWith(expect.objectContaining({ isReady: true }));
  });

  it('shows a retry action when the initial request fails', () => {
    setInvestigations({ data: undefined, error: new Error('Network unavailable') });

    renderApp();

    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
    expect(refetch).toHaveBeenCalledTimes(1);
  });

  it('keeps cached investigations visible when a refresh fails', () => {
    setInvestigations({ error: new Error('Network unavailable') });

    renderApp();

    expect(screen.getByText('Checkout errors are elevated')).toBeInTheDocument();
    expect(
      screen.getByText('Showing the last loaded results; refreshing failed.')
    ).toBeInTheDocument();
  });

  it('opens and closes the selected investigation from the URL', () => {
    renderApp();

    fireEvent.click(screen.getByRole('button', { name: 'Checkout errors are elevated' }));
    expect(screen.getByText('Flyout: investigation-1')).toBeInTheDocument();
    expect(screen.getByTestId('locationProbe')).toHaveTextContent(
      '?investigationId=investigation-1'
    );

    fireEvent.click(screen.getByRole('button', { name: 'Close' }));
    expect(screen.queryByText('Flyout: investigation-1')).not.toBeInTheDocument();
    expect(screen.getByTestId('locationProbe')).toHaveTextContent('');
  });
});
