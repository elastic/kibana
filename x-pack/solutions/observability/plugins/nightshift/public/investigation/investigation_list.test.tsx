/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';
import type { InvestigationSectionState } from '../hooks/use_investigation_sections';
import { InvestigationList } from './investigation_list';

jest.mock('../hooks/use_kibana', () => ({
  useKibana: () => ({
    services: {
      agenticInvestigations: {},
    },
  }),
}));

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
});
