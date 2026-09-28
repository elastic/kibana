/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';
import type { ListInvestigationItem } from '@kbn/nightshift-investigations-plugin/common';
import type { InvestigationSectionState } from '../hooks/use_investigation_sections';
import { InvestigationList } from './investigation_list';

const investigation: ListInvestigationItem = {
  investigation_id: 'investigation-1',
  title: 'Checkout errors',
  status: 'completed',
  created_at: '2026-09-11T09:00:00.000Z',
  subject: { type: 'significant_event', id: 'event-1', summary: 'Investigate checkout errors' },
  summary: 'Checkout errors are elevated',
  severity: '80-critical',
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
    renderSections([
      makeSection('80-critical', { isInitialLoading: true }),
      makeSection('60-high'),
    ]);

    expect(
      screen.getByTestId('nightshiftInvestigationSectionSkeleton-80-critical')
    ).toBeInTheDocument();
    expect(screen.queryByTestId('nightshiftInvestigationSection-60-high')).not.toBeInTheDocument();
  });

  it('hides a resolved empty section', () => {
    renderSections([
      makeSection('80-critical', { investigations: [investigation], total: 1 }),
      makeSection('60-high'),
    ]);

    expect(screen.getByTestId('nightshiftInvestigationSection-80-critical')).toBeInTheDocument();
    expect(screen.queryByTestId('nightshiftInvestigationSection-60-high')).not.toBeInTheDocument();
    expect(screen.queryByTestId('nightshiftInvestigationsEmpty')).not.toBeInTheDocument();
  });

  it('keeps an empty section that failed to load so it can be retried', () => {
    renderSections([makeSection('80-critical', { error: new Error('Network unavailable') })]);

    expect(screen.getByTestId('nightshiftInvestigationSection-80-critical')).toBeInTheDocument();
    expect(
      screen.getByTestId('nightshiftInvestigationSectionRetry-80-critical')
    ).toBeInTheDocument();
  });

  it('shows a single empty state when every section is empty', () => {
    renderSections([makeSection('in-progress'), makeSection('80-critical')]);

    expect(screen.getByTestId('nightshiftInvestigationsEmpty')).toHaveTextContent(
      'No investigations found'
    );
    expect(
      screen.queryByTestId('nightshiftInvestigationSection-in-progress')
    ).not.toBeInTheDocument();
    expect(
      screen.queryByTestId('nightshiftInvestigationSection-80-critical')
    ).not.toBeInTheDocument();
  });

  it('renders in progress first and failed last', () => {
    renderSections([
      makeSection('in-progress', { investigations: [investigation], total: 1 }),
      makeSection('80-critical', { investigations: [investigation], total: 1 }),
      makeSection('failed', { investigations: [investigation], total: 1 }),
    ]);

    const titles = screen.getAllByRole('heading').map((heading) => heading.textContent);
    expect(titles).toEqual(['In progress', 'Critical', 'Failed & cancelled']);
  });
});
