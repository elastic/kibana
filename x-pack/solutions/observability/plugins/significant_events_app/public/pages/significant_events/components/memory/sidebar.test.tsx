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
import type { MemoryFilter, MemorySidebarSelection, MemorySummary } from './types';

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

/** Defaults for a settled, empty, first-page query. */
const listProps = (overrides: Record<string, unknown> = {}) => ({
  pages: [] as MemorySummary[],
  isLoading: false,
  isError: false,
  hasNextPage: false,
  isFetchingNextPage: false,
  onLoadMore: jest.fn(),
  ...overrides,
});

const renderSidebar = (
  list: Record<string, unknown> = {},
  selection: MemorySidebarSelection = { kind: 'home' },
  onSelect = jest.fn(),
  onFilterChange = jest.fn(),
  filter: MemoryFilter = 'active'
) => {
  const props = listProps(list);
  render(
    <I18nProvider>
      <MemorySidebar
        filter={filter}
        onFilterChange={onFilterChange}
        selection={selection}
        onSelect={onSelect}
        pages={props.pages}
        isLoading={props.isLoading}
        isError={props.isError}
        hasNextPage={props.hasNextPage}
        isFetchingNextPage={props.isFetchingNextPage}
        onLoadMore={props.onLoadMore}
      />
    </I18nProvider>
  );
  return { onSelect, onFilterChange, onLoadMore: props.onLoadMore };
};

describe('MemorySidebar', () => {
  it('lists a memory and reports the selection', async () => {
    const { onSelect } = renderSidebar({ pages: [summary()] });

    await userEvent.click(screen.getByTestId('nightshiftMemoryLink-memory_kafka-lag'));

    expect(onSelect).toHaveBeenCalledWith({ kind: 'page', id: 'memory_kafka-lag' });
  });

  it('narrows the loaded rows as the operator types', async () => {
    renderSidebar({
      pages: [summary(), summary({ id: 'memory_redis', title: 'Redis evictions' })],
    });

    expect(screen.getByText('Kafka consumer lag')).toBeInTheDocument();
    expect(screen.getByText('Redis evictions')).toBeInTheDocument();

    await userEvent.type(screen.getByTestId('nightshiftMemorySearch'), 'redis');

    await waitFor(() => {
      expect(screen.queryByText('Kafka consumer lag')).not.toBeInTheDocument();
    });
    expect(screen.getByText('Redis evictions')).toBeInTheDocument();
  });

  it('says so when a search matches nothing', async () => {
    renderSidebar({ pages: [summary()] });

    await userEvent.type(screen.getByTestId('nightshiftMemorySearch'), 'zzzz');

    await waitFor(() => {
      expect(screen.getByText('No memories match that search.')).toBeInTheDocument();
    });
  });

  it('changes the filter through the button group', async () => {
    const { onFilterChange } = renderSidebar();

    await userEvent.click(screen.getByTestId('nightshiftMemoryFilter-archived'));

    expect(onFilterChange).toHaveBeenCalledWith('archived');
  });

  it('asks for the next page only when the server offered a cursor', async () => {
    const { onLoadMore } = renderSidebar({ pages: [summary()], hasNextPage: true });

    await userEvent.click(screen.getByTestId('nightshiftMemoryLoadMore'));

    expect(onLoadMore).toHaveBeenCalled();
  });

  it('offers no load-more control on the last page', () => {
    renderSidebar({ pages: [summary()], hasNextPage: false });

    expect(screen.queryByTestId('nightshiftMemoryLoadMore')).not.toBeInTheDocument();
  });

  it('renders a spinner then the empty state, not a stale list', async () => {
    const { rerender } = render(
      <I18nProvider>
        <MemorySidebar
          filter="active"
          onFilterChange={jest.fn()}
          selection={{ kind: 'home' }}
          onSelect={jest.fn()}
          {...listProps({ isLoading: true })}
        />
      </I18nProvider>
    );
    expect(screen.getByTestId('nightshiftMemorySidebarLoading')).toBeInTheDocument();

    rerender(
      <I18nProvider>
        <MemorySidebar
          filter="active"
          onFilterChange={jest.fn()}
          selection={{ kind: 'home' }}
          onSelect={jest.fn()}
          {...listProps()}
        />
      </I18nProvider>
    );

    expect(screen.getByTestId('nightshiftMemorySidebarEmpty')).toBeInTheDocument();
  });
});
