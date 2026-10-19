/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';
import type { InvestigationSummary } from '@kbn/agentic-investigations-plugin/common';
import type { InvestigationSectionState } from '../hooks/use_investigation_sections';
import { InvestigationList } from './investigation_list';

jest.mock('../hooks/use_kibana', () => ({
  useKibana: () => ({
    services: {
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
  fetchNextPage: jest.fn(),
  refetch: jest.fn(),
  ...overrides,
});

const renderSections = (sections: InvestigationSectionState[]) =>
  render(
    <I18nProvider>
      <InvestigationList sections={sections} />
    </I18nProvider>
  );

describe('InvestigationList', () => {
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

  it('renders in progress first and not rated last', () => {
    renderSections([
      makeSection('in-progress', { investigations: [investigation], total: 1 }),
      makeSection('critical', { investigations: [investigation], total: 1 }),
      makeSection('not-rated', { investigations: [investigation], total: 1 }),
    ]);

    const titles = screen.getAllByRole('heading').map((heading) => heading.textContent);
    expect(titles).toEqual(['In progress', 'Critical', 'Not rated']);
  });

  it('renders each investigation as the shared investigation card', () => {
    renderSections([makeSection('critical', { investigations: [investigation], total: 1 })]);

    expect(screen.getByTestId('investigationCard')).toHaveTextContent('Checkout errors');
  });
});
