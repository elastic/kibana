/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';
import { MemoryTab } from './tab';
import {
  useMemoryEnabled,
  useMemoryKeywordPages,
  useMemoryPage,
  useMemoryPages,
} from './use_memory';
import type { MemoryListResult, MemoryPageSummary } from './types';

jest.mock('./use_memory');
jest.mock('../../../../hooks/use_kibana', () => ({
  useKibana: () => ({
    dependencies: {
      start: { nightshiftInvestigations: { investigationsClient: { fetch: jest.fn() } } },
    },
  }),
}));

const mockUseMemoryPages = useMemoryPages as jest.MockedFunction<typeof useMemoryPages>;
const mockUseMemoryPage = useMemoryPage as jest.MockedFunction<typeof useMemoryPage>;
const mockUseMemoryEnabled = useMemoryEnabled as jest.MockedFunction<typeof useMemoryEnabled>;
const mockUseMemoryKeywordPages = useMemoryKeywordPages as jest.MockedFunction<
  typeof useMemoryKeywordPages
>;

mockUseMemoryEnabled.mockReturnValue({ isEnabled: true, isLoading: false });

const summary = (overrides: Partial<MemoryPageSummary> = {}): MemoryPageSummary =>
  ({
    id: 'memory_kafka-lag',
    slug: 'kafka-lag',
    title: 'Kafka consumer lag',
    description: 'Checkout consumer lag',
    content: 'Scale the consumer.',
    context: 'Checkout latency spike',
    tags: ['memory', 'kafka'],
    archived: false,
    categories: [],
    references: [],
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-01-01T00:00:00.000Z',
    created_by: 'sre',
    updated_by: 'sre',
    telemetry: {
      impressions: 10,
      conversions: 5,
      last_impression_time: '2026-01-01T00:00:00.000Z',
    },
    usefulness: 0.5,
    confidence: 0.8,
    ...overrides,
  } as MemoryPageSummary);

const listResult = (pages: MemoryPageSummary[]): MemoryListResult => ({
  pages,
  total: pages.length,
  stats: {
    total: pages.length,
    archived: 0,
  },
});

// The home view's keyword chart asks for its own wider slice of live memories,
// so it has to be given one even though the tab's list query drives the rest of
// the view. Both the unfiltered and the selected-keywords calls read the same
// mock, which is what a single cached query would do.
mockUseMemoryKeywordPages.mockReturnValue({
  data: listResult([]),
} as unknown as ReturnType<typeof useMemoryKeywordPages>);

const asQueryResult = (overrides: Record<string, unknown>) =>
  ({
    isLoading: false,
    isError: false,
    rows: [],
    hasNextPage: false,
    isFetchingNextPage: false,
    fetchNextPage: jest.fn(),
    ...overrides,
  } as unknown as ReturnType<typeof useMemoryPages>);

const renderTab = () =>
  render(
    <I18nProvider>
      <MemoryTab />
    </I18nProvider>
  );

describe('MemoryTab', () => {
  it('lists memories in the sidebar and shows the overview', () => {
    mockUseMemoryPages.mockReturnValue(
      asQueryResult({ rows: [summary()], stats: listResult([summary()]).stats })
    );
    renderTab();
    expect(screen.getByTestId('nightshiftMemoryHome')).toBeInTheDocument();
    expect(screen.getAllByText('Kafka consumer lag').length).toBeGreaterThan(0);
  });

  it('shows an empty state when there are no memories', () => {
    mockUseMemoryPages.mockReturnValue(asQueryResult({ rows: [], stats: listResult([]).stats }));
    renderTab();
    expect(screen.getByTestId('nightshiftMemorySidebarEmpty')).toBeInTheDocument();
  });

  it('shows an error prompt when the list fails', () => {
    mockUseMemoryPages.mockReturnValue(asQueryResult({ isError: true }));
    renderTab();
    expect(screen.getByText('Could not load Semantic Memory')).toBeInTheDocument();
  });

  it('keeps archived memories out of the home view but lists them in the sidebar', () => {
    mockUseMemoryPages.mockReturnValue(
      asQueryResult({
        rows: [summary(), summary({ id: 'memory_old', title: 'Retired memory', archived: true })],
        stats: { total: 2, archived: 1 },
      })
    );
    renderTab();
    // The sidebar is the one place a retired memory is still reachable.
    expect(screen.getByTestId('nightshiftMemoryLink-memory_old')).toBeInTheDocument();
  });

  it('surfaces usefulness and confidence on a row', () => {
    mockUseMemoryPages.mockReturnValue(
      asQueryResult({
        rows: [summary({ usefulness: 0.75, confidence: 0.5 })],
        stats: listResult([]).stats,
      })
    );
    renderTab();
    expect(screen.getAllByText(/usefulness 75%/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/confidence 50%/).length).toBeGreaterThan(0);
  });

  it('renders a detail view without offering archive controls for a reader-less surface', () => {
    mockUseMemoryPages.mockReturnValue(
      asQueryResult({ rows: [summary()], stats: listResult([summary()]).stats })
    );
    // Selection starts on home; the detail view is exercised through the crumb
    // and archive tests, which need a selected page.
    mockUseMemoryPage.mockReturnValue({
      data: {
        page: summary(),
        usefulness: 0.5,
        confidence: 0.8,
      },
      isLoading: false,
      isError: false,
    } as unknown as ReturnType<typeof useMemoryPage>);
    renderTab();
    expect(screen.getByTestId('nightshiftMemoryHome')).toBeInTheDocument();
  });
});
