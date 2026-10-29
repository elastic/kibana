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
import { useKibana } from '../../hooks/use_kibana';
import { MemoryPageView } from './page_view';
import { useDeleteMemoryPage, useMemoryPage, useSetMemoryArchived } from './use_memory';
import type { MemoryPage } from './types';

jest.mock('./use_memory');
jest.mock('../../hooks/use_kibana');
// The merged-from row issues its own fetch; stub it so these tests stay about
// the page's own actions.
jest.mock('./lineage', () => ({
  MemoryMergedFromRow: () => <div data-test-subj="nightshiftMemoryMergedFrom" />,
}));

const mockUseKibana = useKibana as jest.MockedFunction<typeof useKibana>;

/**
 * Grant the privilege set the routes require. Archive needs manage; delete needs
 * configure. Defaults to both so the action tests can reach the buttons.
 */
const givenCapabilities = (nightshift: Record<string, boolean>) => {
  mockUseKibana.mockReturnValue({
    services: {
      application: { capabilities: { nightshift } },
      // The source-task link builds its href through basePath, so the shape has to
      // be here even though these tests do not assert on the link.
      http: { basePath: { prepend: (path: string) => path } },
    },
  } as unknown as ReturnType<typeof useKibana>);
};

const mockUseMemoryPage = useMemoryPage as jest.MockedFunction<typeof useMemoryPage>;
/** Each mutation mock calls the success callback the view handed it, as react-query does. */
const mockSetArchived = jest.fn(
  (_variables: { id: string; archived: boolean }, options?: { onSuccess?: () => void }) =>
    options?.onSuccess?.()
);
const mockDelete = jest.fn(
  (
    _variables: { id: string; version: { seq_no: number; primary_term: number } },
    options?: { onSuccess?: () => void }
  ) => options?.onSuccess?.()
);
const mockUseSetArchived = useSetMemoryArchived as jest.MockedFunction<typeof useSetMemoryArchived>;
const mockUseDelete = useDeleteMemoryPage as jest.MockedFunction<typeof useDeleteMemoryPage>;

const page = (overrides: Partial<MemoryPage> = {}): MemoryPage => ({
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
  telemetry: { impressions: 10, conversions: 5, last_impression_time: '2026-01-01T00:00:00.000Z' },
  ...overrides,
});

/** The Elasticsearch revision the detail route returns with the page. */
const VERSION = { seq_no: 7, primary_term: 1 };

const asDetail = (
  overrides: Partial<MemoryPage> = {},
  data = { usefulness: 0.5, confidence: 0.8 }
) =>
  ({
    isLoading: false,
    isError: false,
    data: { page: page(overrides), version: VERSION, ...data },
  } as unknown as ReturnType<typeof useMemoryPage>);

const renderView = (
  onDeleted = jest.fn(),
  onSelectPage = jest.fn(),
  onSelectKeyword = jest.fn()
) => {
  // A fresh element per call: React bails out of a re-render that is handed the
  // very same element, and these tests rerender to model a refetch.
  const ui = () => (
    <I18nProvider>
      <MemoryPageView
        pageId="memory_kafka-lag"
        onSelectPage={onSelectPage}
        onSelectKeyword={onSelectKeyword}
        onDeleted={onDeleted}
      />
    </I18nProvider>
  );
  const { rerender } = render(ui());
  return { rerenderView: () => rerender(ui()), onDeleted, onSelectPage, onSelectKeyword };
};

beforeEach(() => {
  jest.clearAllMocks();
  givenCapabilities({ manage: true, configure: true });
  mockUseSetArchived.mockReturnValue({ mutate: mockSetArchived, isLoading: false } as never);
  mockUseDelete.mockReturnValue({ mutate: mockDelete, isLoading: false } as never);
});

describe('MemoryPageView', () => {
  it('clamps a rate outside [0, 1] rather than rendering 4000%', () => {
    mockUseMemoryPage.mockReturnValue(asDetail({}, { usefulness: 4, confidence: -1 }));
    renderView();

    expect(screen.getByTestId('nightshiftMemoryUsefulnessValue')).toHaveTextContent('100%');
    expect(screen.getByTestId('nightshiftMemoryConfidenceValue')).toHaveTextContent('0%');
  });

  it('lists the memory tags but not the internal memory marker', () => {
    mockUseMemoryPage.mockReturnValue(asDetail({ tags: ['memory', 'kafka', 'checkout'] }));
    renderView();

    expect(screen.getByText('kafka')).toBeInTheDocument();
    expect(screen.getByText('checkout')).toBeInTheDocument();
    // `memory` is the store's own type tag, not something the investigator wrote.
    expect(screen.queryByText('memory')).not.toBeInTheDocument();
  });

  it('hides archive and delete from a read-only viewer', () => {
    // The routes require manage for archive and configure for delete. A viewer
    // granted neither should see the page without actions that would 403.
    givenCapabilities({});
    mockUseMemoryPage.mockReturnValue(asDetail());
    renderView();

    expect(screen.getByTestId('nightshiftMemoryPageTitle')).toBeInTheDocument();
    expect(screen.queryByTestId('nightshiftMemoryArchiveToggle')).not.toBeInTheDocument();
    expect(screen.queryByTestId('nightshiftMemoryDeleteButton')).not.toBeInTheDocument();
  });

  it('restores an archived memory rather than re-archiving it', async () => {
    mockUseMemoryPage.mockReturnValue(asDetail({ archived: true, archive_reason: 'harmful' }));
    renderView();

    expect(screen.getByTestId('nightshiftMemoryArchivedBadge')).toBeInTheDocument();
    await userEvent.click(screen.getByTestId('nightshiftMemoryArchiveToggle'));

    await waitFor(() => {
      expect(mockSetArchived).toHaveBeenCalledWith({ id: 'memory_kafka-lag', archived: false });
    });
  });

  it('writes once per click, so a failed archive is never retried behind the operator', async () => {
    // The store already exhausted its own optimistic-concurrency retries; the UI
    // must not paper over that with another one. The failure itself is toasted by
    // the hook, which is what `use_memory.test.tsx` covers.
    mockUseMemoryPage.mockReturnValue(asDetail({ archived: true, archive_reason: 'manual' }));
    renderView();

    await userEvent.click(screen.getByTestId('nightshiftMemoryArchiveToggle'));

    await waitFor(() => expect(mockSetArchived).toHaveBeenCalledTimes(1));
  });

  it('does not delete without an explicit confirmation', async () => {
    mockUseMemoryPage.mockReturnValue(asDetail());
    renderView();

    await userEvent.click(screen.getByTestId('nightshiftMemoryDeleteButton'));
    // The dialog is open, but nothing has been deleted yet.
    expect(screen.getByTestId('nightshiftMemoryDeleteConfirm')).toBeInTheDocument();
    expect(mockDelete).not.toHaveBeenCalled();
  });

  it('deletes the revision the dialog was opened on, not one refetched while open', async () => {
    // The optimizer rewrites content without changing the title, so the revision
    // is what distinguishes the page the dialog was opened on from its
    // replacement. A refetch while the dialog is open must not swap it in.
    const rewritten = { seq_no: 8, primary_term: 1 };
    const detail = (version: { seq_no: number; primary_term: number }) =>
      ({
        isLoading: false,
        isError: false,
        data: { page: page(), version, usefulness: 0.5, confidence: 0.8 },
      } as unknown as ReturnType<typeof useMemoryPage>);
    mockUseMemoryPage.mockReturnValue(detail(VERSION));
    const { rerenderView } = renderView();

    await userEvent.click(screen.getByTestId('nightshiftMemoryDeleteButton'));
    mockUseMemoryPage.mockReturnValue(detail(rewritten));
    rerenderView();
    await userEvent.click(screen.getByText('Delete permanently'));

    await waitFor(() =>
      expect(mockDelete).toHaveBeenCalledWith(
        expect.objectContaining({ version: VERSION }),
        expect.objectContaining({ onSuccess: expect.any(Function) })
      )
    );
  });

  it('stays on the page when the delete write fails', async () => {
    // The optimizer writes asynchronously, so a conflict is a real outcome the
    // operator has to see. The hook toasts it; the view must not navigate away.
    // The operator has to see something, so the write is offered once and left
    // alone. A failing mutation never calls its success callback.
    mockDelete.mockImplementation(() => undefined);
    mockUseMemoryPage.mockReturnValue(asDetail());
    const { onDeleted } = renderView();

    await userEvent.click(screen.getByTestId('nightshiftMemoryDeleteButton'));
    await userEvent.click(screen.getByText('Delete permanently'));

    await waitFor(() => expect(mockDelete).toHaveBeenCalled());
    // The memory may well still be there — the store never confirmed the delete.
    expect(onDeleted).not.toHaveBeenCalled();
    expect(screen.getByTestId('nightshiftMemoryPageTitle')).toBeInTheDocument();
  });

  it('keeps the actions hidden from a viewer with the show privilege alone', async () => {
    // `show` lets the tab render; it is not `manage`, so neither write is offered.
    givenCapabilities({ show: true });
    mockUseMemoryPage.mockReturnValue(asDetail());
    renderView();

    expect(screen.getByTestId('nightshiftMemoryPageTitle')).toBeInTheDocument();
    expect(screen.queryByTestId('nightshiftMemoryArchiveToggle')).not.toBeInTheDocument();
    expect(screen.queryByTestId('nightshiftMemoryDeleteButton')).not.toBeInTheDocument();
  });

  it('offers archive but not delete to a manager without configure', async () => {
    // The tiers are not nested in the UI: delete needs configure, so a manager
    // gets the reversible action only.
    givenCapabilities({ show: true, manage: true });
    mockUseMemoryPage.mockReturnValue(asDetail());
    renderView();

    expect(screen.getByTestId('nightshiftMemoryArchiveToggle')).toBeInTheDocument();
    expect(screen.queryByTestId('nightshiftMemoryDeleteButton')).not.toBeInTheDocument();
  });

  it('names the conversation itself when the memory recorded no task text', () => {
    mockUseMemoryPage.mockReturnValue(
      asDetail({ context: '', conversation_id: 'conv-1', agent_id: 'agent-1' })
    );
    renderView();

    expect(screen.getByTestId('nightshiftMemorySourceTaskLink')).toHaveTextContent(
      'Agent Builder conversation'
    );
  });

  it('omits the source task for a memory that recorded neither', () => {
    mockUseMemoryPage.mockReturnValue(asDetail({ context: '' }));
    renderView();

    expect(screen.queryByTestId('nightshiftMemorySourceTask')).not.toBeInTheDocument();
  });
});
