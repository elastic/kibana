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
import type { InvestigationSectionState } from '../hooks/use_investigation_sections';
import { useInvestigationSections } from '../hooks/use_investigation_sections';
import { useKibana } from '../hooks/use_kibana';

jest.mock('../hooks/use_investigation_sections');
jest.mock('../hooks/use_kibana');
jest.mock('@kbn/ebt-tools');

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

const mockUseInvestigationSections = useInvestigationSections as jest.Mock;
const mockUseKibana = useKibana as jest.Mock;
const mockUsePageReady = usePageReady as jest.Mock;

const investigation: ListInvestigationItem = {
  investigation_id: 'investigation-1',
  title: 'Checkout errors',
  status: 'running',
  created_at: '2026-09-11T09:00:00.000Z',
  subject: { type: 'significant_event', id: 'event-1', summary: 'Investigate checkout errors' },
  summary: 'Checkout errors are elevated',
};

const criticalInvestigation: ListInvestigationItem = {
  investigation_id: 'investigation-critical',
  status: 'completed',
  created_at: '2026-09-11T09:00:00.000Z',
  subject: { type: 'significant_event', id: 'event-2', summary: 'Critical checkout outage' },
  summary: 'Checkout is down',
  severity: '80-critical',
};

const highInvestigation: ListInvestigationItem = {
  investigation_id: 'investigation-high',
  status: 'completed',
  created_at: '2026-09-11T09:00:00.000Z',
  subject: { type: 'significant_event', id: 'event-3', summary: 'High latency' },
  summary: 'Latency is high',
  severity: '60-high',
};

const refetchAll = jest.fn();

// jsdom implements neither, and scrolling to a section is how a tile and `?severity=` both work.
const scrollIntoView = jest.fn();
Element.prototype.scrollIntoView = scrollIntoView;

function makeSection(
  id: InvestigationSectionState['id'],
  overrides: Partial<InvestigationSectionState> = {}
): InvestigationSectionState {
  return {
    id,
    investigations: [],
    total: 0,
    hasMore: false,
    isInitialLoading: false,
    isFetchingNextPage: false,
    isFetching: false,
    isPreviousData: false,
    error: null,
    fetchNextPage: jest.fn(),
    refetch: jest.fn(),
    ...overrides,
  };
}

function setSections({
  sections,
  hasActiveInvestigations = false,
  isInitialLoading = false,
  isFetching = false,
}: {
  sections: InvestigationSectionState[];
  hasActiveInvestigations?: boolean;
  isInitialLoading?: boolean;
  isFetching?: boolean;
}) {
  mockUseInvestigationSections.mockReturnValue({
    sections,
    severityCounts: {
      '80-critical': sections.find((section) => section.id === '80-critical')?.total ?? 0,
      '60-high': sections.find((section) => section.id === '60-high')?.total ?? 0,
      '40-medium': sections.find((section) => section.id === '40-medium')?.total ?? 0,
      '20-low': sections.find((section) => section.id === '20-low')?.total ?? 0,
    },
    hasActiveInvestigations,
    isInitialLoading,
    isFetching,
    totalCount: sections.reduce((sum, section) => sum + section.total, 0),
    loadedCount: sections.reduce((sum, section) => sum + section.investigations.length, 0),
    refetchAll,
  });
}

function defaultSections(
  overrides: Partial<
    Record<InvestigationSectionState['id'], Partial<InvestigationSectionState>>
  > = {}
): InvestigationSectionState[] {
  return [
    makeSection('in-progress', overrides['in-progress']),
    makeSection('80-critical', overrides['80-critical']),
    makeSection('60-high', overrides['60-high']),
    makeSection('40-medium', overrides['40-medium']),
    makeSection('20-low', overrides['20-low']),
    makeSection('failed', overrides.failed),
  ];
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
    refetchAll.mockClear();
    scrollIntoView.mockClear();
    mockUsePageReady.mockClear();
    mockUseKibana.mockReturnValue({
      services: {
        application: {
          getUrlForApp: () => '/app/significant_events/significant_events',
        },
        nightshiftInvestigations: { investigationsClient: {} },
      },
    });
    setSections({
      sections: defaultSections({
        'in-progress': { investigations: [investigation], total: 1 },
      }),
      hasActiveInvestigations: true,
    });
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
    setSections({ sections: defaultSections() });

    renderApp();

    expect(
      screen.getByText('Investigations are not available in this deployment')
    ).toBeInTheDocument();
    expect(mockUsePageReady).toHaveBeenCalledWith(expect.objectContaining({ isReady: true }));
  });

  it('passes the initial loading state to each section', () => {
    setSections({
      sections: defaultSections({
        'in-progress': { isInitialLoading: true },
        '80-critical': { isInitialLoading: true },
        '60-high': { isInitialLoading: true },
        '40-medium': { isInitialLoading: true },
        '20-low': { isInitialLoading: true },
        failed: { isInitialLoading: true },
      }),
      isInitialLoading: true,
    });

    renderApp();

    expect(
      screen.getByTestId('nightshiftInvestigationSectionSkeleton-in-progress')
    ).toBeInTheDocument();
  });

  it('shows a retry action when every section fails to load', () => {
    const error = new Error('Network unavailable');
    setSections({
      sections: defaultSections({
        'in-progress': { error },
        '80-critical': { error },
        '60-high': { error },
        '40-medium': { error },
        '20-low': { error },
        failed: { error },
      }),
    });

    renderApp();

    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
    expect(refetchAll).toHaveBeenCalledTimes(1);
  });

  it('keeps cached investigations visible when a refresh fails', () => {
    setSections({
      sections: defaultSections({
        'in-progress': {
          investigations: [investigation],
          total: 1,
          error: new Error('Network unavailable'),
        },
      }),
      hasActiveInvestigations: true,
    });

    renderApp();

    expect(screen.getByText('Checkout errors are elevated')).toBeInTheDocument();
    expect(
      screen.getByText('Showing the last loaded results; refreshing failed.')
    ).toBeInTheDocument();
  });

  it('loads more investigations for one severity without touching the others', () => {
    const fetchCritical = jest.fn();
    const fetchHigh = jest.fn();
    setSections({
      sections: defaultSections({
        '80-critical': {
          investigations: [criticalInvestigation],
          total: 11,
          hasMore: true,
          fetchNextPage: fetchCritical,
        },
        '60-high': {
          investigations: [highInvestigation],
          total: 11,
          hasMore: true,
          fetchNextPage: fetchHigh,
        },
      }),
    });

    renderApp();

    fireEvent.click(screen.getByTestId('nightshiftInvestigationSectionShowMore-80-critical'));
    expect(fetchCritical).toHaveBeenCalledTimes(1);
    expect(fetchHigh).not.toHaveBeenCalled();
  });

  it('hides empty severity sections and keeps populated ones', () => {
    renderApp();

    expect(screen.getByTestId('nightshiftInvestigationSection-in-progress')).toBeInTheDocument();
    expect(
      screen.queryByTestId('nightshiftInvestigationSection-80-critical')
    ).not.toBeInTheDocument();
    expect(screen.queryByTestId('nightshiftInvestigationSection-failed')).not.toBeInTheDocument();
  });

  it('shows a single empty state when there are no investigations', () => {
    setSections({ sections: defaultSections() });

    renderApp();

    expect(screen.getByTestId('nightshiftInvestigationsEmpty')).toHaveTextContent(
      'No investigations found'
    );
    expect(
      screen.queryByTestId('nightshiftInvestigationSection-in-progress')
    ).not.toBeInTheDocument();
  });

  it('does not scroll from a severity tile with no investigations', () => {
    renderApp();

    fireEvent.click(screen.getByTestId('nightshiftSeverityTile-80-critical'));
    expect(screen.getByTestId('locationProbe')).toHaveTextContent('');
    expect(scrollIntoView).not.toHaveBeenCalled();
  });

  it('scrolls to a severity section from its tile', () => {
    setSections({
      sections: defaultSections({
        '80-critical': { investigations: [criticalInvestigation], total: 1 },
      }),
    });

    renderApp();

    fireEvent.click(screen.getByTestId('nightshiftSeverityTile-80-critical'));
    expect(scrollIntoView).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId('locationProbe')).toHaveTextContent('?severity=80-critical');
  });

  it('keeps a severity tile actionable when its section failed to load, since it still renders', () => {
    setSections({
      sections: defaultSections({ '80-critical': { error: new Error('boom') } }),
    });

    renderApp();

    expect(screen.getByTestId('nightshiftInvestigationSection-80-critical')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('nightshiftSeverityTile-80-critical'));
    expect(scrollIntoView).toHaveBeenCalledTimes(1);
  });

  it('does not show a count of zero on the tiles before the sections have loaded', () => {
    setSections({ sections: defaultSections(), isInitialLoading: true });

    renderApp();

    expect(screen.queryByTestId('nightshiftSeverityTileCount-80-critical')).not.toBeInTheDocument();
  });

  it('opens and closes the selected investigation from the URL', () => {
    renderApp();

    fireEvent.click(screen.getByTestId('nightshiftInvestigationListItem'));
    expect(screen.getByText('Flyout: investigation-1')).toBeInTheDocument();
    expect(screen.getByTestId('locationProbe')).toHaveTextContent(
      '?investigationId=investigation-1'
    );

    fireEvent.click(screen.getByRole('button', { name: 'Close' }));
    expect(screen.queryByText('Flyout: investigation-1')).not.toBeInTheDocument();
    expect(screen.getByTestId('locationProbe')).toHaveTextContent('');
  });
});
