/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { usePageReady } from '@kbn/ebt-tools';
import { I18nProvider } from '@kbn/i18n-react';
import type { InvestigationSummary } from '@kbn/agentic-investigations-plugin/common';
import { NIGHTSHIFT_UI_PRIVILEGES } from '@kbn/nightshift-shared';
import React from 'react';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { NightshiftApp } from './app';
import type { InvestigationSectionState } from '../hooks/use_investigation_sections';
import { useInvestigationSections } from '../hooks/use_investigation_sections';
import { useKibana } from '../hooks/use_kibana';

jest.mock('../hooks/use_investigation_sections');
jest.mock('../hooks/use_kibana');
jest.mock('@kbn/ebt-tools');

jest.mock('../investigation/start_investigation_panel', () => ({
  START_INVESTIGATION_PANEL_ID: 'nightshiftStartInvestigationPanel',
  StartInvestigationPanel: ({ onClose }: { onClose: () => void }) => (
    <div data-test-subj="nightshiftStartInvestigationPanel">
      <button onClick={onClose} type="button">
        Cancel investigation
      </button>
    </div>
  ),
}));

const mockUseInvestigationSections = useInvestigationSections as jest.Mock;
const mockUseKibana = useKibana as jest.Mock;
const mockUsePageReady = usePageReady as jest.Mock;

const makeInvestigation = (
  id: string,
  title: string,
  overrides: Partial<InvestigationSummary> = {}
): InvestigationSummary => ({
  id,
  title,
  created_at: '2026-09-11T09:00:00.000Z',
  updated_at: '2026-09-11T09:00:00.000Z',
  agent_id: 'nightshift.investigation',
  metadata: { status: 'open' },
  in_progress: false,
  subjects: [],
  ...overrides,
});

const investigation = makeInvestigation('investigation-1', 'Checkout errors', {
  in_progress: true,
  metadata: { status: 'open', summary: 'Checkout errors are elevated' },
});

const criticalInvestigation = makeInvestigation('investigation-critical', 'Critical checkout', {
  metadata: { status: 'open', severity: 'critical', summary: 'Checkout is down' },
});

const highInvestigation = makeInvestigation('investigation-high', 'High latency', {
  metadata: { status: 'open', severity: 'high', summary: 'Latency is high' },
});

/** Stands in for the shared card the agentic investigations plugin provides. */
const InvestigationCard = ({
  investigation: item,
  onClick,
}: {
  investigation: InvestigationSummary;
  onClick?: (item: InvestigationSummary) => void;
}) => (
  <button type="button" onClick={() => onClick?.(item)}>
    {item.metadata.summary ?? item.title}
  </button>
);

const closeConversationDetails = jest.fn();
const openConversationDetails = jest.fn();

const refetchAll = jest.fn();

const manageCapabilities = {
  [NIGHTSHIFT_UI_PRIVILEGES.show]: true,
  [NIGHTSHIFT_UI_PRIVILEGES.manage]: true,
};

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
    makeSection('not-rated', overrides['not-rated']),
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
          capabilities: { nightshift: manageCapabilities },
          getUrlForApp: () => '/app/significant_events/significant_events',
        },
        nightshiftInvestigations: { investigationsClient: {} },
        agenticInvestigations: { InvestigationCard },
        agentBuilder: { openConversationDetails },
        notifications: { toasts: { addSuccess: jest.fn() } },
      },
    });
    openConversationDetails.mockReset().mockImplementation(async () => closeConversationDetails);
    closeConversationDetails.mockReset();
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
        application: {
          capabilities: { nightshift: manageCapabilities },
          getUrlForApp: () => '/app/significant_events/significant_events',
        },
        notifications: { toasts: { addSuccess: jest.fn() } },
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
        'not-rated': { isInitialLoading: true },
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
        'not-rated': { error },
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
    expect(
      screen.queryByTestId('nightshiftInvestigationSection-not-rated')
    ).not.toBeInTheDocument();
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

  it("opens the selected investigation's conversation details flyout and clears the URL on close", async () => {
    renderApp();

    fireEvent.click(screen.getByRole('button', { name: 'Checkout errors are elevated' }));
    expect(screen.getByTestId('locationProbe')).toHaveTextContent(
      '?investigationId=investigation-1'
    );
    await waitFor(() =>
      expect(openConversationDetails).toHaveBeenCalledWith(
        expect.objectContaining({
          conversationId: 'investigation-1',
          trailingActions: [expect.objectContaining({ iconType: 'link' })],
        })
      )
    );

    const [{ onClose }] = openConversationDetails.mock.calls[0];
    onClose();
    await waitFor(() => expect(screen.getByTestId('locationProbe')).toHaveTextContent(''));
  });

  it('opens the conversation details flyout from an investigation locator link', async () => {
    renderApp({ initialEntries: ['/?investigationId=conversation-9'] });

    await waitFor(() =>
      expect(openConversationDetails).toHaveBeenCalledWith(
        expect.objectContaining({ conversationId: 'conversation-9' })
      )
    );
  });

  it('opens and closes the start investigation panel from the header', () => {
    renderApp();

    const startButton = screen.getByTestId('o11yNightshiftAppStartInvestigationButton');
    expect(screen.queryByTestId('nightshiftStartInvestigationPanel')).not.toBeInTheDocument();

    fireEvent.click(startButton);
    expect(screen.getByTestId('nightshiftStartInvestigationPanel')).toBeInTheDocument();
    expect(startButton).toHaveAttribute('aria-expanded', 'true');

    fireEvent.click(screen.getByRole('button', { name: 'Cancel investigation' }));
    expect(screen.queryByTestId('nightshiftStartInvestigationPanel')).not.toBeInTheDocument();
  });

  it('hides the start investigation button without the Nightshift manage privilege', () => {
    mockUseKibana.mockReturnValue({
      services: {
        application: {
          capabilities: { nightshift: { [NIGHTSHIFT_UI_PRIVILEGES.show]: true } },
          getUrlForApp: () => '/app/significant_events/significant_events',
        },
        nightshiftInvestigations: { investigationsClient: {} },
        agenticInvestigations: { InvestigationCard },
        agentBuilder: { openConversationDetails },
        notifications: { toasts: { addSuccess: jest.fn() } },
      },
    });

    renderApp();

    expect(
      screen.queryByTestId('o11yNightshiftAppStartInvestigationButton')
    ).not.toBeInTheDocument();
    expect(screen.getByTestId('o11yNightshiftAppShowAllLink')).toBeInTheDocument();
  });
});
