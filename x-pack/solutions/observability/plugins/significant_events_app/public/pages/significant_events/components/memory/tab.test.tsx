/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { I18nProvider } from '@kbn/i18n-react';
import { MemoryTab } from './tab';
import {
  useMemoryEnabled,
  useMemoryKeywordPages,
  useMemoryPage,
  useMemoryPages,
  useSetMemoryArchived,
  useDeleteMemoryPage,
} from './use_memory';
import type { MemoryListResult, MemoryPageSummary } from './types';

jest.mock('./use_memory');
// The detail view's merged-from row issues its own fetch; stub it so this suite
// stays about how the tab wires its views together.
jest.mock('./lineage', () => ({
  MemoryMergedFromRow: () => null,
}));
jest.mock('../../../../hooks/use_kibana', () => ({
  useKibana: () => ({
    core: {
      application: { capabilities: { nightshift: {} } },
      http: { basePath: { prepend: (path: string) => path } },
    },
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
// The detail view offers archive and delete; this suite never writes, so the
// mutation hooks only have to answer with their loading state.
(useSetMemoryArchived as jest.MockedFunction<typeof useSetMemoryArchived>).mockReturnValue({
  mutate: jest.fn(),
  isLoading: false,
} as never);
(useDeleteMemoryPage as jest.MockedFunction<typeof useDeleteMemoryPage>).mockReturnValue({
  mutate: jest.fn(),
  isLoading: false,
} as never);

const summary = (overrides: Partial<MemoryPageSummary> = {}): MemoryPageSummary =>
  ({
    id: 'memory_kafka-lag',
    slug: 'kafka-lag',
    title: 'Kafka consumer lag',
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
// the view.
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

  it('narrows only the sidebar when searching, not the home view', async () => {
    const stats = { total: 1, archived: 0 };
    mockUseMemoryPages.mockImplementation((_filter, search = '') =>
      asQueryResult(search === '' ? { rows: [summary()], stats } : { rows: [], stats })
    );
    renderTab();

    await userEvent.type(screen.getByTestId('nightshiftMemorySearch'), 'redis');

    await waitFor(() =>
      expect(screen.getByTestId('nightshiftMemorySidebarEmpty')).toBeInTheDocument()
    );
    expect(mockUseMemoryPages).toHaveBeenLastCalledWith('active', 'redis');
    expect(screen.getByTestId('nightshiftMemoryHomeStats')).toHaveTextContent('1 memory');
    expect(
      within(screen.getByTestId('nightshiftMemoryHome')).getAllByText('Kafka consumer lag').length
    ).toBeGreaterThan(0);
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
    expect(screen.getAllByText(/75% useful/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/50% confidence/).length).toBeGreaterThan(0);
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

  it('answers a tag clicked on a memory by filtering home, and returns there', async () => {
    // Stored tags are canonical, so the tag is already the keyword the chart keys.
    const tagged = summary({ tags: ['memory', 'invoke-agent'] });
    mockUseMemoryPages.mockReturnValue(
      asQueryResult({ rows: [tagged], stats: listResult([tagged]).stats })
    );
    mockUseMemoryPage.mockReturnValue({
      data: { page: tagged, usefulness: 0.5, confidence: 0.8 },
      isLoading: false,
      isError: false,
    } as unknown as ReturnType<typeof useMemoryPage>);
    renderTab();

    await userEvent.click(screen.getByTestId('nightshiftMemoryLink-memory_kafka-lag'));
    await userEvent.click(screen.getByTestId('nightshiftMemoryTag-invoke-agent'));

    // Home, not the detail view: the tag answers a question about other
    // memories, so it leaves the one being read.
    expect(screen.getByTestId('nightshiftMemoryHome')).toBeInTheDocument();
    expect(screen.getByTestId('nightshiftMemoryKeywordFilters')).toBeInTheDocument();
    expect(screen.getByTestId('nightshiftMemoryKeywordChip-invoke-agent')).toBeInTheDocument();
  });
});
