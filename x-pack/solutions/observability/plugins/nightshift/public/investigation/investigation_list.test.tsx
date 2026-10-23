/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';
import type { InvestigationSummary } from '@kbn/agentic-investigations-plugin/common';
import type { InvestigationSectionState } from '../hooks/use_investigation_sections';
import { InvestigationList, type InvestigationListHandle } from './investigation_list';
import { getSectionExpansionStorageKey } from './use_investigation_section_expansion';

let mockBasePath = '/s/team-a';
const SECTION_EXPANSION_STORAGE_KEY = getSectionExpansionStorageKey('/s/team-a');

jest.mock('../hooks/use_kibana', () => ({
  useKibana: () => ({
    services: {
      http: { basePath: { get: () => mockBasePath } },
      agenticInvestigations: {
        InvestigationCard: ({ investigation: item }: { investigation: InvestigationSummary }) => (
          <div data-test-subj="investigationCard">{item.title}</div>
        ),
      },
    },
  }),
}));

const investigation: InvestigationSummary = {
  id: 'investigation-1',
  title: 'Checkout errors',
  title_pending: false,
  created_at: '2026-09-11T09:00:00.000Z',
  updated_at: '2026-09-11T09:00:00.000Z',
  agent_id: 'nightshift.investigation',
  metadata: { status: 'open', severity: 'critical', summary: 'Checkout errors are elevated' },
  in_progress: false,
  subjects: [],
};

const makeSection = (
  id: InvestigationSectionState['id'],
  overrides: Partial<InvestigationSectionState> = {}
): InvestigationSectionState => ({
  id,
  investigations: [],
  total: 0,
  hasMore: false,
  isInitialLoading: false,
  isFetchingNextPage: false,
  isFetching: false,
  isPreviousData: false,
  error: null,
  isFilteredOut: false,
  fetchNextPage: jest.fn(),
  refetch: jest.fn(),
  ...overrides,
});

const renderSections = (
  sections: InvestigationSectionState[],
  ref?: React.RefObject<InvestigationListHandle>
) =>
  render(
    <I18nProvider>
      <InvestigationList ref={ref} sections={sections} />
    </I18nProvider>
  );

/** EUI makes the accordion arrow the keyboard control; it carries the expanded state. */
const getToggleControl = (id: string): HTMLElement => {
  const control = document.querySelector<HTMLElement>(
    `[aria-controls="nightshiftInvestigationSection-${id}-accordion"][aria-expanded]`
  );
  if (control == null) {
    throw new Error(`No toggle control for section ${id}`);
  }
  return control;
};

// jsdom does not implement it, and scrolling to a section is how a severity tile works.
const scrollIntoView = jest.fn();
Element.prototype.scrollIntoView = scrollIntoView;

describe('InvestigationList', () => {
  beforeEach(() => {
    window.localStorage.clear();
    mockBasePath = '/s/team-a';
    scrollIntoView.mockClear();
  });

  it('keeps skeletons visible while a section is loading', () => {
    renderSections([makeSection('critical', { isInitialLoading: true }), makeSection('high')]);

    expect(
      screen.getByTestId('nightshiftInvestigationSectionSkeleton-critical')
    ).toBeInTheDocument();
    expect(screen.queryByTestId('nightshiftInvestigationSection-high')).not.toBeInTheDocument();
  });

  it('hides a resolved empty section', () => {
    renderSections([
      makeSection('critical', { investigations: [investigation], total: 1 }),
      makeSection('high'),
    ]);

    expect(screen.getByTestId('nightshiftInvestigationSection-critical')).toBeInTheDocument();
    expect(screen.queryByTestId('nightshiftInvestigationSection-high')).not.toBeInTheDocument();
    expect(screen.queryByTestId('nightshiftInvestigationsEmpty')).not.toBeInTheDocument();
  });

  it('keeps an empty section that failed to load so it can be retried', () => {
    renderSections([makeSection('critical', { error: new Error('Network unavailable') })]);

    expect(screen.getByTestId('nightshiftInvestigationSection-critical')).toBeInTheDocument();
    expect(screen.getByTestId('nightshiftInvestigationSectionRetry-critical')).toBeInTheDocument();
  });

  it('shows a single empty state when every section is empty', () => {
    renderSections([makeSection('in-progress'), makeSection('critical')]);

    expect(screen.getByTestId('nightshiftInvestigationsEmpty')).toHaveTextContent(
      'No investigations found'
    );
    expect(
      screen.queryByTestId('nightshiftInvestigationSection-in-progress')
    ).not.toBeInTheDocument();
    expect(screen.queryByTestId('nightshiftInvestigationSection-critical')).not.toBeInTheDocument();
  });

  it('renders the sections in the order given: in progress first, closed last', () => {
    renderSections([
      makeSection('in-progress', { investigations: [investigation], total: 1 }),
      makeSection('critical', { investigations: [investigation], total: 1 }),
      makeSection('not-rated', { investigations: [investigation], total: 1 }),
      makeSection('closed', { investigations: [investigation], total: 1 }),
    ]);

    const titles = screen.getAllByRole('heading').map((heading) => heading.textContent);
    expect(titles).toEqual(['In progress', 'Critical', 'Not rated', 'Closed']);
  });

  it('starts every section expanded except closed', () => {
    renderSections([
      makeSection('critical', { investigations: [investigation], total: 1 }),
      makeSection('not-rated', { investigations: [investigation], total: 1 }),
      makeSection('closed', { investigations: [investigation], total: 1 }),
    ]);

    expect(getToggleControl('critical')).toHaveAttribute('aria-expanded', 'true');
    expect(getToggleControl('not-rated')).toHaveAttribute('aria-expanded', 'true');
    expect(getToggleControl('closed')).toHaveAttribute('aria-expanded', 'false');
  });

  it('remembers a toggle across reloads through local storage', () => {
    const sections = [
      makeSection('critical', { investigations: [investigation], total: 1 }),
      makeSection('closed', { investigations: [investigation], total: 1 }),
    ];
    const { unmount } = renderSections(sections);

    fireEvent.click(screen.getByTestId('nightshiftInvestigationSectionToggle-critical'));
    fireEvent.click(screen.getByTestId('nightshiftInvestigationSectionToggle-closed'));

    expect(getToggleControl('critical')).toHaveAttribute('aria-expanded', 'false');
    expect(getToggleControl('closed')).toHaveAttribute('aria-expanded', 'true');
    expect(JSON.parse(window.localStorage.getItem(SECTION_EXPANSION_STORAGE_KEY) ?? '{}')).toEqual({
      critical: false,
      closed: true,
    });
    unmount();

    renderSections(sections);

    expect(getToggleControl('critical')).toHaveAttribute('aria-expanded', 'false');
    expect(getToggleControl('closed')).toHaveAttribute('aria-expanded', 'true');
  });

  it('keeps a separate preference in each space', () => {
    const sections = [makeSection('critical', { investigations: [investigation], total: 1 })];
    const { unmount } = renderSections(sections);

    fireEvent.click(screen.getByTestId('nightshiftInvestigationSectionToggle-critical'));
    expect(getToggleControl('critical')).toHaveAttribute('aria-expanded', 'false');
    unmount();

    mockBasePath = '';
    renderSections(sections);

    expect(getToggleControl('critical')).toHaveAttribute('aria-expanded', 'true');
    expect(
      JSON.parse(
        window.localStorage.getItem('nightshift.investigations.sectionsExpanded:/s/team-a') ?? '{}'
      )
    ).toEqual({ critical: false });
    expect(
      JSON.parse(
        window.localStorage.getItem('nightshift.investigations.sectionsExpanded:default') ?? '{}'
      )
    ).toEqual({});
  });

  it('ignores a malformed stored preference', () => {
    window.localStorage.setItem(SECTION_EXPANSION_STORAGE_KEY, '["critical"]');
    renderSections([makeSection('critical', { investigations: [investigation], total: 1 })]);

    expect(getToggleControl('critical')).toHaveAttribute('aria-expanded', 'true');
  });

  it('expands a collapsed section before scrolling to it', () => {
    window.localStorage.setItem(SECTION_EXPANSION_STORAGE_KEY, JSON.stringify({ high: false }));
    const ref = React.createRef<InvestigationListHandle>();
    renderSections([makeSection('high', { investigations: [investigation], total: 1 })], ref);

    expect(getToggleControl('high')).toHaveAttribute('aria-expanded', 'false');

    let scrolled: boolean | undefined;
    act(() => {
      scrolled = ref.current?.scrollToSeverity('high');
    });

    expect(scrolled).toBe(true);
    expect(scrollIntoView).toHaveBeenCalledTimes(1);
    expect(getToggleControl('high')).toHaveAttribute('aria-expanded', 'true');
    expect(ref.current?.scrollToSeverity('critical')).toBe(false);
  });

  it('shows a section a search emptied as collapsed with a message', () => {
    renderSections([
      makeSection('critical', { investigations: [investigation], total: 1 }),
      makeSection('high', { isFilteredOut: true }),
    ]);

    expect(getToggleControl('high')).toHaveAttribute('aria-expanded', 'false');
    expect(screen.getByTestId('nightshiftInvestigationSectionFilteredOut-high')).toHaveTextContent(
      'No investigations in this group match your search.'
    );
    expect(screen.queryByTestId('nightshiftInvestigationsEmpty')).not.toBeInTheDocument();
  });

  it('opens a filtered-out section without saving it, and restores the saved state after the search', () => {
    window.localStorage.setItem(SECTION_EXPANSION_STORAGE_KEY, JSON.stringify({ high: false }));
    const { rerender } = renderSections([makeSection('high', { isFilteredOut: true })]);

    fireEvent.click(screen.getByTestId('nightshiftInvestigationSectionToggle-high'));

    expect(getToggleControl('high')).toHaveAttribute('aria-expanded', 'true');
    expect(JSON.parse(window.localStorage.getItem(SECTION_EXPANSION_STORAGE_KEY) ?? '{}')).toEqual({
      high: false,
    });

    rerender(
      <I18nProvider>
        <InvestigationList
          sections={[makeSection('high', { investigations: [investigation], total: 1 })]}
        />
      </I18nProvider>
    );

    expect(getToggleControl('high')).toHaveAttribute('aria-expanded', 'false');
  });

  it('scrolls to a filtered-out section without opening it', () => {
    const ref = React.createRef<InvestigationListHandle>();
    renderSections([makeSection('high', { isFilteredOut: true })], ref);

    let scrolled: boolean | undefined;
    act(() => {
      scrolled = ref.current?.scrollToSeverity('high');
    });

    expect(scrolled).toBe(true);
    expect(scrollIntoView).toHaveBeenCalledTimes(1);
    expect(getToggleControl('high')).toHaveAttribute('aria-expanded', 'false');
    expect(JSON.parse(window.localStorage.getItem(SECTION_EXPANSION_STORAGE_KEY) ?? '{}')).toEqual(
      {}
    );
  });

  it('renders each investigation as the shared investigation card', () => {
    renderSections([makeSection('critical', { investigations: [investigation], total: 1 })]);

    expect(screen.getByTestId('investigationCard')).toHaveTextContent('Checkout errors');
  });
});
