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
import { MemoryLineage } from './lineage';
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

/**
 * Answers the lineage endpoint. The server walks the whole chain in one request, so
 * the client resolves with every ancestor at once; the tests only need the set.
 */
const respondWith = (ancestors: Array<{ id: string; title: string }>) => {
  fetchMock.mockResolvedValue({
    ancestors: ancestors.map((ancestor) => ({ ...ancestor, usefulness: 0.5, archived: true })),
  });
};

const renderLineage = (target: MemoryPage) =>
  render(
    <I18nProvider>
      <MemoryLineage page={target} onSelectPage={jest.fn()} />
    </I18nProvider>
  );

beforeEach(() => {
  jest.clearAllMocks();
  mockUseKibana.mockReturnValue({
    dependencies: {
      start: { nightshiftInvestigations: { investigationsClient: { fetch: fetchMock } } },
    },
  } as unknown as ReturnType<typeof useKibana>);
});

describe('MemoryLineage', () => {
  it('renders nothing when the memory was not merged from anything', () => {
    renderLineage(page());
    expect(screen.queryByTestId('nightshiftMemoryLineage')).not.toBeInTheDocument();
  });

  it('renders a crumb for the memory it was merged from', async () => {
    respondWith([{ id: 'memory_a', title: 'Kafka lag spikes' }]);
    renderLineage(page({ merged_from: ['memory_a'] }));

    // `waitFor` also wraps the polling in `act`, so the state update from the
    // resolved fetch has been flushed by the time this resolves.
    await waitFor(() => {
      expect(screen.getByTestId('nightshiftMemoryLineage')).toBeInTheDocument();
    });
    expect(screen.getByText('Kafka lag spikes')).toBeInTheDocument();
  });

  it('asks the server once for the whole chain', async () => {
    respondWith([
      { id: 'memory_a', title: 'A' },
      { id: 'memory_b', title: 'B' },
    ]);
    renderLineage(page({ merged_from: ['memory_a', 'memory_b'] }));

    await waitFor(() => {
      expect(screen.getByText('A')).toBeInTheDocument();
    });
    expect(screen.getByText('B')).toBeInTheDocument();
    // The walk happens server-side, so the browser does not fan out one request
    // per ancestor.
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0][0]).toBe('GET /internal/nightshift/memory/pages/{id}/lineage');
  });

  it('is selectable, so the chain is navigable rather than a flat list', async () => {
    respondWith([{ id: 'memory_a', title: 'Kafka lag spikes' }]);
    const onSelectPage = jest.fn();
    render(
      <I18nProvider>
        <MemoryLineage page={page({ merged_from: ['memory_a'] })} onSelectPage={onSelectPage} />
      </I18nProvider>
    );

    await waitFor(() => expect(screen.getByText('Kafka lag spikes')).toBeInTheDocument());
    await userEvent.click(screen.getByText('Kafka lag spikes'));

    expect(onSelectPage).toHaveBeenCalledWith('memory_a');
  });

  it('degrades quietly when lineage cannot be fetched', async () => {
    fetchMock.mockRejectedValue(new Error('lineage unavailable'));
    renderLineage(page({ merged_from: ['memory_a'] }));

    // Lineage is supplementary; a failure must not take the page down.
    await waitFor(() => {
      expect(screen.queryByTestId('nightshiftMemoryLineage')).not.toBeInTheDocument();
    });
  });

  it('does not render an ancestor that repeats further up the chain', async () => {
    // A cycle: the canonical memory was merged from A, and A was merged from the
    // canonical memory. The server refuses to revisit an id, so the trail stops.
    respondWith([{ id: 'memory_a', title: 'A' }]);
    renderLineage(page({ merged_from: ['memory_a'] }));

    await waitFor(() => expect(screen.getByText('A')).toBeInTheDocument());
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('draws the bounded chain the server returns rather than walking it again', async () => {
    // The walk is the server's job and is capped there, so the client renders the
    // trail it is handed instead of following each crumb's own parents — that would
    // be an unbounded walk in the browser.
    respondWith(
      Array.from({ length: 5 }, (_unused, index) => ({
        id: `memory_${index}`,
        title: `Ancestor ${index}`,
      }))
    );
    renderLineage(page({ merged_from: ['memory_0'] }));

    await waitFor(() => expect(screen.getByText('Ancestor 0')).toBeInTheDocument());
    expect(screen.getByText('Ancestor 4')).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('fetches once for a memory that lists itself as its own source', async () => {
    // A self-referencing `merged_from` is malformed, but it must not become a
    // re-fetch loop: the request happens once and whatever comes back is drawn.
    respondWith([]);
    renderLineage(page({ merged_from: ['memory_canonical'] }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    expect(screen.queryByTestId('nightshiftMemoryLineage')).not.toBeInTheDocument();
  });

  it('clears the trail without refetching when a page with no merges is selected', async () => {
    const onSelectPage = jest.fn();
    respondWith([{ id: 'memory_root', title: 'Root' }]);
    const { rerender } = render(
      <I18nProvider>
        <MemoryLineage
          page={page({ id: 'memory_a', merged_from: ['memory_root'] })}
          onSelectPage={onSelectPage}
        />
      </I18nProvider>
    );
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));

    rerender(
      <I18nProvider>
        <MemoryLineage page={page({ id: 'memory_b' })} onSelectPage={onSelectPage} />
      </I18nProvider>
    );

    await waitFor(() =>
      expect(screen.queryByTestId('nightshiftMemoryLineage')).not.toBeInTheDocument()
    );
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
