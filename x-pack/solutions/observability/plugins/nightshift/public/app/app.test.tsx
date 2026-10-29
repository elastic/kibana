/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { fireEvent, render, screen, waitFor } from '@testing-library/react';
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

const mockUseInvestigationSections = useInvestigationSections as jest.Mock;
const mockUseKibana = useKibana as jest.Mock;

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
  areSeverityCountsLoading = false,
  areSeverityCountsFetching = false,
}: {
  sections: InvestigationSectionState[];
  hasActiveInvestigations?: boolean;
  isInitialLoading?: boolean;
  isFetching?: boolean;
  areSeverityCountsLoading?: boolean;
  areSeverityCountsFetching?: boolean;
}) {
  const sectionTotal = (id: InvestigationSectionState['id']) =>
    sections.find((section) => section.id === id)?.total ?? 0;
  // Mirrors the hook: the severity counts cover running investigations too, so they plus the
  // unrated section count every matching investigation exactly once.
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
    areSeverityCountsFetching,
    hasActiveInvestigations,
    isInitialLoading,
    isFetching,
    totalCount: sections.reduce((sum, section) => sum + section.total, 0),
    matchedCount:
      severityCounts.critical +
      severityCounts.high +
      severityCounts.medium +
      severityCounts.low +
      sectionTotal('not-rated'),
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
    reportEvent.mockClear();
    scrollIntoView.mockClear();
    mockUseKibana.mockReturnValue({
      services: {
        analytics,
        application: {
          capabilities: { nightshift: manageCapabilities },
          getUrlForApp: (appId: string, { path }: { path?: string } = {}) =>
            `/app/${appId}${path ?? ''}`,
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

  it('scrolls to a severity section from its tile', () => {
    setSections({
      sections: defaultSections({
        critical: { investigations: [criticalInvestigation], total: 1 },
      }),
    });

    renderApp();

    fireEvent.click(screen.getByTestId('nightshiftSeverityTile-critical'));
    expect(scrollIntoView).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId('locationProbe')).toHaveTextContent('?severity=critical');
  });

  it('keeps a severity tile actionable when its section failed to load, since it still renders', () => {
    setSections({
      sections: defaultSections({ critical: { error: new Error('boom') } }),
    });

    renderApp();

    expect(screen.getByTestId('nightshiftInvestigationSection-critical')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('nightshiftSeverityTile-critical'));
    expect(scrollIntoView).toHaveBeenCalledTimes(1);
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

  it('reports a search by length and result count, never by term', async () => {
    // The running investigation is also listed in its severity section, so the section totals
    // add up to two while only one investigation matches.
    setSections({
      sections: defaultSections({
        'in-progress': { investigations: [investigation], total: 1 },
        critical: { investigations: [investigation], total: 1 },
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
