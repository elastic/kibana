/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { I18nProvider } from '@kbn/i18n-react';
import { MemorySidebar } from './sidebar';
import { useMemoryPages } from './use_memory';
import type { MemoryFilter, MemorySidebarSelection, MemorySummary } from './types';

jest.mock('./use_memory');

const mockUseMemoryPages = useMemoryPages as jest.MockedFunction<typeof useMemoryPages>;

const summary = (overrides: Partial<MemorySummary> = {}): MemorySummary =>
  ({
    id: 'memory_kafka-lag',
    slug: 'kafka-lag',
    title: 'Kafka consumer lag',
    content: 'Scale the consumer.',
    context: 'Checkout latency spike',
    tags: ['memory'],
    archived: false,
    categories: [],
    references: [],
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-01-01T00:00:00.000Z',
    created_by: 'sre',
    updated_by: 'sre',
    telemetry: { impressions: 1, conversions: 0, last_impression_time: '2026-01-01T00:00:00.000Z' },
    usefulness: 0,
    confidence: 0,
    ...overrides,
  } as MemorySummary);

const asQuery = (overrides: Record<string, unknown> = {}) =>
  ({
    rows: [],
    stats: undefined,
    isLoading: false,
    isError: false,
    hasNextPage: false,
    isFetchingNextPage: false,
    fetchNextPage: jest.fn(),
    ...overrides,
  } as unknown as ReturnType<typeof useMemoryPages>);

const renderSidebar = (
  selection: MemorySidebarSelection = { kind: 'home' },
  onSelect = jest.fn(),
  onFilterChange = jest.fn(),
  filter: MemoryFilter = 'active'
) => {
  render(
    <I18nProvider>
      <MemorySidebar
        filter={filter}
        onFilterChange={onFilterChange}
        selection={selection}
        onSelect={onSelect}
      />
    </I18nProvider>
  );
  return { onSelect, onFilterChange };
};

describe('MemorySidebar', () => {
  it('lists a memory and reports the selection', async () => {
    mockUseMemoryPages.mockReturnValue(asQuery({ rows: [summary()] }));
    const { onSelect } = renderSidebar();

    await userEvent.click(screen.getByTestId('nightshiftMemoryLink-memory_kafka-lag'));

    expect(onSelect).toHaveBeenCalledWith({ kind: 'page', id: 'memory_kafka-lag' });
  });

  it('narrows the loaded rows as the operator types', async () => {
    mockUseMemoryPages.mockReturnValue(
      asQuery({ rows: [summary(), summary({ id: 'memory_redis', title: 'Redis evictions' })] })
    );
    renderSidebar();

    expect(screen.getByText('Kafka consumer lag')).toBeInTheDocument();
    expect(screen.getByText('Redis evictions')).toBeInTheDocument();

    await userEvent.type(screen.getByTestId('nightshiftMemorySearch'), 'redis');

    await waitFor(() => {
      expect(screen.queryByText('Kafka consumer lag')).not.toBeInTheDocument();
    });
    expect(screen.getByText('Redis evictions')).toBeInTheDocument();
  });

  it('says so when a search matches nothing', async () => {
    mockUseMemoryPages.mockReturnValue(asQuery({ rows: [summary()] }));
    renderSidebar();

    await userEvent.type(screen.getByTestId('nightshiftMemorySearch'), 'zzzz');

    await waitFor(() => {
      expect(screen.getByText('No memories match that search.')).toBeInTheDocument();
    });
  });

  it('changes the filter through the button group', async () => {
    mockUseMemoryPages.mockReturnValue(asQuery({ rows: [] }));
    const { onFilterChange } = renderSidebar();

    await userEvent.click(screen.getByTestId('nightshiftMemoryFilter-archived'));

    expect(onFilterChange).toHaveBeenCalledWith('archived');
  });

  it('asks for the next page only when the server offered a cursor', async () => {
    const fetchNextPage = jest.fn();
    mockUseMemoryPages.mockReturnValue(
      asQuery({ rows: [summary()], hasNextPage: true, fetchNextPage })
    );
    renderSidebar();

    await userEvent.click(screen.getByTestId('nightshiftMemoryLoadMore'));

    expect(fetchNextPage).toHaveBeenCalled();
  });

  it('offers no load-more control on the last page', () => {
    mockUseMemoryPages.mockReturnValue(asQuery({ rows: [summary()], hasNextPage: false }));
    renderSidebar();

    expect(screen.queryByTestId('nightshiftMemoryLoadMore')).not.toBeInTheDocument();
  });

  it('renders a spinner then the empty state, not a stale list', async () => {
    mockUseMemoryPages.mockReturnValue(asQuery({ rows: [], isLoading: true }));
    const { rerender } = render(
      <I18nProvider>
        <MemorySidebar
          filter="active"
          onFilterChange={jest.fn()}
          selection={{ kind: 'home' }}
          onSelect={jest.fn()}
        />
      </I18nProvider>
    );
    expect(screen.getByTestId('nightshiftMemorySidebarLoading')).toBeInTheDocument();

    mockUseMemoryPages.mockReturnValue(asQuery({ rows: [] }));
    rerender(
      <I18nProvider>
        <MemorySidebar
          filter="active"
          onFilterChange={jest.fn()}
          selection={{ kind: 'home' }}
          onSelect={jest.fn()}
        />
      </I18nProvider>
    );

    expect(screen.getByTestId('nightshiftMemorySidebarEmpty')).toBeInTheDocument();
  });
});
