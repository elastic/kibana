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
import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import { MemoryMergedFromRow } from './lineage';
import { useKibana } from '../../../../hooks/use_kibana';
import type { MemoryPage } from './types';

// Mock the module and drive it from the test body. Closing over a `const` inside
// the factory would throw, because `jest.mock` is hoisted above the imports.
jest.mock('../../../../hooks/use_kibana');
const mockUseKibana = useKibana as jest.MockedFunction<typeof useKibana>;

const fetchMock = jest.fn();

const page = (overrides: Partial<MemoryPage> = {}): MemoryPage => ({
  id: 'memory_canonical',
  slug: 'canonical',
  title: 'Checkout is slow',
  content: 'c',
  tags: ['memory'],
  archived: false,
  categories: [],
  references: [],
  created_at: '',
  updated_at: '',
  created_by: '',
  updated_by: '',
  telemetry: { impressions: 1, conversions: 0, last_impression_time: '' },
  ...overrides,
});

/** Answers the lineage endpoint with the direct sources the server resolved. */
const respondWith = (sources: Array<{ id: string; title: string }>) => {
  fetchMock.mockResolvedValue({ sources });
};

/** Retries are off so a rejected lineage request fails the assertion, not the run. */
const createWrapper = () => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <I18nProvider>{children}</I18nProvider>
    </QueryClientProvider>
  );
};

const renderRow = (target: MemoryPage, onSelectPage = jest.fn()) =>
  render(<MemoryMergedFromRow page={target} onSelectPage={onSelectPage} />, {
    wrapper: createWrapper(),
  });

beforeEach(() => {
  jest.clearAllMocks();
  mockUseKibana.mockReturnValue({
    dependencies: {
      start: { nightshiftInvestigations: { investigationsClient: { fetch: fetchMock } } },
    },
  } as unknown as ReturnType<typeof useKibana>);
});

describe('MemoryMergedFromRow', () => {
  it('renders no row for a memory that was not merged from anything', () => {
    renderRow(page());

    expect(screen.queryByText('Merged from')).not.toBeInTheDocument();
    // Nothing to resolve, so the store is not asked at all.
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('names the direct sources of the merge', async () => {
    respondWith([
      { id: 'memory_a', title: 'Kafka lag spikes' },
      { id: 'memory_b', title: 'DNS resolution stalls' },
    ]);
    renderRow(page({ merged_from: ['memory_a', 'memory_b'] }));

    await waitFor(() => expect(screen.getByText('Kafka lag spikes')).toBeInTheDocument());
    expect(screen.getByText('DNS resolution stalls')).toBeInTheDocument();
    // One row for the fan-in: a merge is several sources, not a chain.
    expect(screen.getByText('Merged from')).toBeInTheDocument();
    // The server reads the page's own `merged_from`, so the browser asks once.
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0][0]).toBe('GET /internal/nightshift/memory/pages/{id}/lineage');
  });

  it('draws nothing for a page whose sources are all gone', async () => {
    // A deleted or never-stored source is simply absent from the response, so
    // the row is left out rather than rendered with an empty title.
    respondWith([]);
    renderRow(page({ merged_from: ['memory_deleted'] }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    expect(screen.queryByText('Merged from')).not.toBeInTheDocument();
  });

  it('opens the memory a source names', async () => {
    respondWith([
      { id: 'memory_a', title: 'Kafka lag spikes' },
      { id: 'memory_b', title: 'DNS resolution stalls' },
    ]);
    const onSelectPage = jest.fn();
    renderRow(page({ merged_from: ['memory_a', 'memory_b'] }), onSelectPage);

    await waitFor(() => expect(screen.getByText('DNS resolution stalls')).toBeInTheDocument());
    await userEvent.click(screen.getByText('DNS resolution stalls'));

    expect(onSelectPage).toHaveBeenCalledWith('memory_b');
  });

  it('degrades quietly when the sources cannot be fetched', async () => {
    fetchMock.mockRejectedValue(new Error('lineage unavailable'));
    renderRow(page({ merged_from: ['memory_a'] }));

    // Provenance is supplementary; a failure must not take the page down.
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    expect(screen.queryByText('Merged from')).not.toBeInTheDocument();
  });

  it('drops the row without refetching when a page with no merges is selected', async () => {
    respondWith([{ id: 'memory_root', title: 'Root' }]);
    const onSelectPage = jest.fn();
    const { rerender } = render(
      <MemoryMergedFromRow
        page={page({ id: 'memory_a', merged_from: ['memory_root'] })}
        onSelectPage={onSelectPage}
      />,
      { wrapper: createWrapper() }
    );
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));

    rerender(<MemoryMergedFromRow page={page({ id: 'memory_b' })} onSelectPage={onSelectPage} />);

    await waitFor(() => expect(screen.queryByText('Merged from')).not.toBeInTheDocument());
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
