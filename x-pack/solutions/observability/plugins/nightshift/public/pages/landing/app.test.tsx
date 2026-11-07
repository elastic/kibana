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
import { isDemoArchived } from '../../data/investigations/demo_archive_store';
import type { InvestigationSectionState } from '../../data/investigations/use_investigation_sections';
import { useInvestigationSections } from '../../data/investigations/use_investigation_sections';
import { useFetchInvestigations } from '../../data/investigations/use_fetch_investigations';
import { useKibana } from '../../hooks/use_kibana';
import { useDetectionSetupBanner } from './use_detection_setup_banner';

jest.mock('../../data/investigations/use_investigation_sections');
jest.mock('../../data/investigations/use_fetch_investigations');
jest.mock('../../data/investigations/demo_archive_store', () => ({
  isDemoArchived: jest.fn(() => false),
}));
jest.mock('../../hooks/use_kibana');
jest.mock('@kbn/ebt-tools');
jest.mock('../../components/entities/investigation/use_investigation_assignees', () => ({
  useInvestigationAssignees: () => () => null,
}));
jest.mock('../../components/ui/time_range_picker', () => ({
  NightshiftTimeRangePicker: () => <div data-test-subj="nightshiftHomepageTimePicker" />,
}));
jest.mock('./use_detection_setup_banner');

const mockUseInvestigationSections = useInvestigationSections as jest.Mock;
const mockUseFetchInvestigations = useFetchInvestigations as jest.Mock;
const mockIsDemoArchived = isDemoArchived as jest.MockedFunction<typeof isDemoArchived>;
const mockUseKibana = useKibana as jest.Mock;
const mockUsePageReady = usePageReady as jest.Mock;
const mockUseDetectionSetupBanner = useDetectionSetupBanner as jest.Mock;

const makeInvestigation = (
  id: string,
  title: string,
  overrides: Partial<InvestigationSummary> = {}
): InvestigationSummary => ({
  id,
  title,
  title_pending: false,
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
const reportEvent = jest.fn();
const analytics = { reportEvent };
const dismissDetectionSetupBanner = jest.fn();

const refetchAll = jest.fn();

const manageCapabilities = {
  [NIGHTSHIFT_UI_PRIVILEGES.show]: true,
  [NIGHTSHIFT_UI_PRIVILEGES.manage]: true,
};

// jsdom implements neither, and scrolling to a section is how a tile and `?severity=` both work.
const scrollTo = jest.fn();
Element.prototype.scrollTo = scrollTo;

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
  areSeverityCountsLoading = false,
}: {
  sections: InvestigationSectionState[];
  hasActiveInvestigations?: boolean;
  isInitialLoading?: boolean;
  isFetching?: boolean;
  areSeverityCountsLoading?: boolean;
}) {
  const sectionTotal = (id: InvestigationSectionState['id']) =>
    sections.find((section) => section.id === id)?.total ?? 0;
  // Mirrors the hook: the counts cover the finished investigations the tier sections hold.
  const severityCounts = {
    critical: sectionTotal('critical'),
    high: sectionTotal('high'),
    medium: sectionTotal('medium'),
    low: sectionTotal('low'),
  };
  mockUseInvestigationSections.mockReturnValue({
    sections,
    severityCounts,
    areSeverityCountsLoading,
    hasActiveInvestigations,
    isInitialLoading,
    isFetching,
    totalCount: sections
      .filter((section) => section.id !== 'recent')
      .reduce((sum, section) => sum + section.total, 0),
    loadedCount: sections
      .filter((section) => section.id !== 'recent')
      .reduce((sum, section) => sum + section.investigations.length, 0),
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
    makeSection('critical', overrides['critical']),
    makeSection('high', overrides['high']),
    makeSection('medium', overrides['medium']),
    makeSection('low', overrides['low']),
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
    reportEvent.mockClear();
    scrollTo.mockClear();
    mockUsePageReady.mockClear();
    dismissDetectionSetupBanner.mockClear();
    mockUseDetectionSetupBanner.mockReturnValue({
      isVisible: false,
      dismiss: dismissDetectionSetupBanner,
    });
    mockUseKibana.mockReturnValue({
      services: {
        analytics,
        http: { basePath: { get: () => '' } },
        application: {
          capabilities: { nightshift: manageCapabilities },
          getUrlForApp: (appId: string, { path }: { path?: string } = {}) =>
            `/app/${appId}${path ?? ''}`,
        },
        nightshiftInvestigations: { investigationsClient: {} },
        agenticInvestigations: { InvestigationCard },
        agentBuilder: { openConversationDetails },
        notifications: { toasts: { addSuccess: jest.fn() } },
        charts: {
          theme: {
            useChartsBaseTheme: () => ({}),
            useSparklineOverrides: () => ({}),
          },
        },
      },
    });
    openConversationDetails.mockReset().mockImplementation(async () => closeConversationDetails);
    closeConversationDetails.mockReset();
    mockIsDemoArchived.mockReturnValue(false);
    mockUseFetchInvestigations.mockReturnValue({
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

    expect(screen.getByTestId('nightshiftHomepageViewAllInvestigations')).toHaveAttribute(
      'href',
      '/app/nightshift/investigations'
    );
    expect(screen.getByTestId('nightshiftHomepageTimePicker')).toBeInTheDocument();
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

  it('dismisses the detection setup banner from its dismiss button', () => {
    mockUseDetectionSetupBanner.mockReturnValue({
      isVisible: true,
      dismiss: dismissDetectionSetupBanner,
    });

    renderApp();

    expect(screen.getByTestId('nightshiftDetectionSetupBannerConfigureButton')).toHaveAttribute(
      'href',
      '/app/nightshift/detections/events'
    );
    fireEvent.click(screen.getByRole('button', { name: 'Dismiss' }));
    expect(dismissDetectionSetupBanner).toHaveBeenCalledTimes(1);
  });

  it('shows the unavailable callout and reports ready when the optional plugin is absent', () => {
    mockUseKibana.mockReturnValue({
      services: {
        analytics,
        http: { basePath: { get: () => '' } },
        application: {
          capabilities: { nightshift: manageCapabilities },
          getUrlForApp: (appId: string, { path }: { path?: string } = {}) =>
            `/app/${appId}${path ?? ''}`,
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
        critical: { isInitialLoading: true },
        high: { isInitialLoading: true },
        medium: { isInitialLoading: true },
        low: { isInitialLoading: true },
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
        critical: { error },
        high: { error },
        medium: { error },
        low: { error },
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
        critical: {
          investigations: [criticalInvestigation],
          total: 11,
          hasMore: true,
          fetchNextPage: fetchCritical,
        },
        high: {
          investigations: [highInvestigation],
          total: 11,
          hasMore: true,
          fetchNextPage: fetchHigh,
        },
      }),
    });

    renderApp();

    fireEvent.click(screen.getByTestId('nightshiftInvestigationSectionShowMore-critical'));
    expect(fetchCritical).toHaveBeenCalledTimes(1);
    expect(fetchHigh).not.toHaveBeenCalled();
  });

  it('hides empty severity sections and keeps populated ones', () => {
    renderApp();

    expect(screen.getByTestId('nightshiftInvestigationSection-in-progress')).toBeInTheDocument();
    expect(screen.queryByTestId('nightshiftInvestigationSection-critical')).not.toBeInTheDocument();
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

  it('replaces the empty state when only archived investigations match the search', () => {
    const archived = makeInvestigation('archived-1', 'Old checkout', {
      metadata: { status: 'closed', summary: 'Old checkout' },
    });
    mockIsDemoArchived.mockImplementation(({ id }) => id === 'archived-1');
    mockUseFetchInvestigations.mockReturnValue({
      investigations: [archived],
      total: 1,
      hasMore: false,
      isInitialLoading: false,
      isFetchingNextPage: false,
      isFetching: false,
      isPreviousData: false,
      error: null,
      fetchNextPage: jest.fn(),
      refetch: jest.fn(),
    });
    setSections({ sections: defaultSections() });

    renderApp({ initialEntries: ['/?q=checkout'] });

    expect(screen.getByTestId('nightshiftArchivedOnlyEmpty')).toHaveTextContent(
      '1 archived investigation found'
    );
    expect(screen.getByTestId('nightshiftArchivedOnlyEmptyLink')).toHaveTextContent('View all');
    expect(screen.queryByTestId('nightshiftArchivedMatchNotice')).not.toBeInTheDocument();
    expect(screen.queryByText('No investigations found')).not.toBeInTheDocument();
  });

  it('keeps the also-found notice when open results and archived matches both exist', () => {
    const archived = makeInvestigation('archived-1', 'Old checkout', {
      metadata: { status: 'closed', summary: 'Old checkout' },
    });
    mockIsDemoArchived.mockImplementation(({ id }) => id === 'archived-1');
    mockUseFetchInvestigations.mockReturnValue({
      investigations: [archived],
      total: 1,
      hasMore: false,
      isInitialLoading: false,
      isFetchingNextPage: false,
      isFetching: false,
      isPreviousData: false,
      error: null,
      fetchNextPage: jest.fn(),
      refetch: jest.fn(),
    });
    setSections({
      sections: defaultSections({
        'in-progress': { investigations: [investigation], total: 1 },
      }),
      hasActiveInvestigations: true,
    });

    renderApp({ initialEntries: ['/?q=checkout'] });

    expect(screen.getByTestId('nightshiftArchivedMatchNotice')).toHaveTextContent(
      '1 archived investigation also found'
    );
    expect(screen.queryByTestId('nightshiftArchivedOnlyEmpty')).not.toBeInTheDocument();
  });

  it('hides severity tiles when every severity count is zero', () => {
    renderApp();

    expect(screen.queryByTestId('nightshiftSeverityTiles')).not.toBeInTheDocument();
  });

  it('does not scroll from a severity tile with no investigations', () => {
    setSections({
      sections: defaultSections({
        high: { investigations: [highInvestigation], total: 1 },
      }),
    });

    renderApp();

    fireEvent.click(screen.getByTestId('nightshiftSeverityTile-critical'));
    expect(screen.getByTestId('locationProbe')).toHaveTextContent('');
    expect(scrollTo).not.toHaveBeenCalled();
  });

  it('scrolls to a severity section from its tile', async () => {
    setSections({
      sections: defaultSections({
        critical: { investigations: [criticalInvestigation], total: 1 },
      }),
    });

    renderApp();

    fireEvent.click(screen.getByTestId('nightshiftSeverityTile-critical'));
    await waitFor(() => expect(scrollTo).toHaveBeenCalled());
    expect(screen.getByTestId('locationProbe')).toHaveTextContent('?severity=critical');
  });

  it.each([
    ['its severity tile is clicked', undefined],
    ['a ?severity= link points at it', '/?severity=critical'],
  ])('opens a closed section when %s', async (_how, link) => {
    setSections({
      sections: defaultSections({
        critical: { investigations: [criticalInvestigation], total: 1 },
      }),
    });
    window.localStorage.setItem(
      'nightshift.investigations.collapsedSections.v2:default',
      JSON.stringify(['critical', 'closed'])
    );

    renderApp(link ? { initialEntries: [link] } : undefined);
    if (!link) {
      fireEvent.click(screen.getByTestId('nightshiftSeverityTile-critical'));
    }

    await waitFor(() =>
      expect(screen.getByTestId('nightshiftInvestigationSectionToggle-critical')).toHaveAttribute(
        'aria-expanded',
        'true'
      )
    );
  });

  it('keeps a severity tile actionable when its section failed to load, since it still renders', async () => {
    setSections({
      sections: defaultSections({
        critical: {
          investigations: [criticalInvestigation],
          total: 1,
          error: new Error('boom'),
        },
      }),
    });

    renderApp();

    expect(screen.getByTestId('nightshiftInvestigationSection-critical')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('nightshiftSeverityTile-critical'));
    await waitFor(() => expect(scrollTo).toHaveBeenCalled());
  });

  it('does not show a count of zero on the tiles before the sections have loaded', () => {
    setSections({ sections: defaultSections(), isInitialLoading: true });

    renderApp();

    expect(screen.queryByTestId('nightshiftSeverityTileCount-critical')).not.toBeInTheDocument();
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

  it('reports the landing page view once, with the counts it shows', () => {
    setSections({
      sections: defaultSections({
        critical: { investigations: [criticalInvestigation], total: 1 },
        high: { investigations: [highInvestigation], total: 1 },
        'not-rated': { investigations: [investigation], total: 1 },
      }),
    });

    const { rerender } = renderApp();

    expect(reportEvent).toHaveBeenCalledWith('nightshift_homepage_viewed', {
      investigation_count: 3,
      critical_count: 1,
      high_count: 1,
      medium_count: 0,
      low_count: 0,
      unrated_count: 1,
    });

    rerender(
      <I18nProvider>
        <MemoryRouter>
          <NightshiftApp />
        </MemoryRouter>
      </I18nProvider>
    );

    expect(
      reportEvent.mock.calls.filter(([eventType]) => eventType === 'nightshift_homepage_viewed')
    ).toHaveLength(1);
  });

  it('waits for the severity counts before reporting the landing page view', () => {
    const sections = defaultSections({
      critical: { investigations: [criticalInvestigation], total: 1 },
    });
    setSections({ sections, areSeverityCountsLoading: true });

    const { rerender } = renderApp();

    expect(reportEvent).not.toHaveBeenCalledWith('nightshift_homepage_viewed', expect.anything());

    setSections({ sections });
    rerender(
      <I18nProvider>
        <MemoryRouter>
          <NightshiftApp />
        </MemoryRouter>
      </I18nProvider>
    );

    expect(reportEvent).toHaveBeenCalledWith(
      'nightshift_homepage_viewed',
      expect.objectContaining({ critical_count: 1 })
    );
  });

  it('reports a clicked investigation with the id it opened', async () => {
    renderApp();

    fireEvent.click(screen.getByRole('button', { name: 'Checkout errors are elevated' }));

    await waitFor(() =>
      expect(reportEvent).toHaveBeenCalledWith(
        'nightshift_investigation_viewed',
        expect.objectContaining({
          investigation_id: 'investigation-1',
          source: 'click',
          status: 'open',
          in_progress: true,
        })
      )
    );
  });

  it('reports an investigation opened by deep link as such', async () => {
    renderApp({ initialEntries: ['/?investigationId=conversation-9'] });

    await waitFor(() =>
      expect(reportEvent).toHaveBeenCalledWith(
        'nightshift_investigation_viewed',
        expect.objectContaining({ investigation_id: 'conversation-9', source: 'deepLink' })
      )
    );
  });

  it('reports a search by length and result count, never by term', async () => {
    setSections({
      sections: defaultSections({
        'in-progress': { investigations: [investigation], total: 1 },
      }),
      hasActiveInvestigations: true,
    });
    renderApp();

    fireEvent.change(screen.getByTestId('nightshiftInvestigationsSearchInput'), {
      target: { value: 'checkout' },
    });

    await waitFor(() =>
      expect(reportEvent).toHaveBeenCalledWith('nightshift_investigations_searched', {
        query_length: 8,
        result_count: 1,
      })
    );
    expect(JSON.stringify(reportEvent.mock.calls)).not.toContain('checkout');
  });
});
