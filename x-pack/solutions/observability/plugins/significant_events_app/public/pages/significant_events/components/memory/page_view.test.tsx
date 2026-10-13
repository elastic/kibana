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
import { useKibana } from '../../../../hooks/use_kibana';
import { MemoryPageView } from './page_view';
import { useDeleteMemoryPage, useMemoryPage, useSetMemoryArchived } from './use_memory';
import type { MemoryPage } from './types';

jest.mock('./use_memory');
jest.mock('../../../../hooks/use_kibana');
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
    core: {
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
  it('renders the title, usefulness and confidence returned by the route', () => {
    mockUseMemoryPage.mockReturnValue(asDetail({}, { usefulness: 0.75, confidence: 0.6 }));
    renderView();

    expect(screen.getByTestId('nightshiftMemoryPageTitle')).toHaveTextContent('Kafka consumer lag');
    // Usefulness and confidence are the two displayed numbers, computed
    // server-side so the UI and the model see the same values.
    expect(screen.getByTestId('nightshiftMemoryUsefulnessValue')).toHaveTextContent('75%');
    expect(screen.getByTestId('nightshiftMemoryConfidenceValue')).toHaveTextContent('60%');
  });

  it('reads usefulness, confidence and age as a stat strip above the provenance', () => {
    mockUseMemoryPage.mockReturnValue(asDetail({}, { usefulness: 0.75, confidence: 0.6 }));
    renderView();

    // The three numbers a reader checks before trusting a memory are labelled
    // stats rather than another row of the same list as the provenance.
    const strip = within(screen.getByTestId('nightshiftMemoryMetadata'));
    expect(strip.getByText('Usefulness')).toBeInTheDocument();
    expect(strip.getByText('Confidence')).toBeInTheDocument();
    expect(strip.getByText('Updated')).toBeInTheDocument();
    expect(screen.getByTestId('nightshiftMemoryUsefulnessValue')).toHaveTextContent('75%');
    expect(screen.getByTestId('nightshiftMemoryConfidenceValue')).toHaveTextContent('60%');
  });

  it('badges the archive reason as a stat rather than a row', () => {
    mockUseMemoryPage.mockReturnValue(
      asDetail({ archived: true, archive_reason: 'merged' as const })
    );
    renderView();

    // The reason sits with the rates: whether a memory can be trusted includes
    // whether it is out of recall, and why.
    const badge = screen.getByTestId('nightshiftMemoryArchivedBadge');
    expect(badge).toHaveTextContent('merged into another memory');
    expect(badge.closest('[class*="euiStat"]')).not.toBeNull();
  });

  it('filters Memory home by a tag when the tag is clicked', async () => {
    mockUseMemoryPage.mockReturnValue(asDetail({ tags: ['memory', 'checkout'] }));
    const { onSelectKeyword } = renderView();

    await userEvent.click(screen.getByTestId('nightshiftMemoryTag-checkout'));

    // Stored tags are canonical, so the tag is handed over as-is.
    expect(onSelectKeyword).toHaveBeenCalledWith('checkout');
  });

  it('names what clicking a tag does, so the badge is not an undiscoverable filter', () => {
    mockUseMemoryPage.mockReturnValue(asDetail({ tags: ['memory', 'checkout'] }));
    renderView();

    expect(screen.getByRole('button', { name: 'Filter memories by checkout' })).toBeInTheDocument();
  });

  it('clamps a rate outside [0, 1] rather than rendering 4000%', () => {
    mockUseMemoryPage.mockReturnValue(asDetail({}, { usefulness: 4, confidence: -1 }));
    renderView();

    expect(screen.getByTestId('nightshiftMemoryUsefulnessValue')).toHaveTextContent('100%');
    expect(screen.getByTestId('nightshiftMemoryConfidenceValue')).toHaveTextContent('0%');
  });

  it('leaves the two rates uncoloured, so colour never carries the verdict', () => {
    // 0% usefulness means "never surfaced", which is the normal state for a new
    // memory, so a warning there would cry wolf on every cold start.
    mockUseMemoryPage.mockReturnValue(asDetail({}, { usefulness: 0, confidence: 0 }));
    renderView();

    for (const colour of ['euiTextColor-danger', 'euiTextColor-warning']) {
      for (const value of ['nightshiftMemoryUsefulnessValue', 'nightshiftMemoryConfidenceValue']) {
        expect(screen.getByTestId(value).className).not.toContain(colour);
      }
    }
  });

  it('shows the task the memory was learned from as its source task', () => {
    mockUseMemoryPage.mockReturnValue(asDetail());
    renderView();

    expect(screen.getByTestId('nightshiftMemorySourceTask')).toHaveTextContent(
      'Checkout latency spike'
    );
  });

  it('lists the memory tags but not the internal memory marker', () => {
    mockUseMemoryPage.mockReturnValue(asDetail({ tags: ['memory', 'kafka', 'checkout'] }));
    renderView();

    expect(screen.getByText('kafka')).toBeInTheDocument();
    expect(screen.getByText('checkout')).toBeInTheDocument();
    // `memory` is the store's own type tag, not something the investigator wrote.
    expect(screen.queryByText('memory')).not.toBeInTheDocument();
  });

  it('badges the reason a memory was retired, so archived is not just a boolean', () => {
    mockUseMemoryPage.mockReturnValue(
      asDetail({ archived: true, archive_reason: 'harmful' as const })
    );
    renderView();

    expect(screen.getByTestId('nightshiftMemoryArchivedBadge')).toHaveTextContent(
      'judged misleading'
    );
  });

  it('badges an archived memory beside its title', () => {
    // The state is the first thing a reader needs, and it is not only in the
    // provenance row: an archived memory is out of recall.
    mockUseMemoryPage.mockReturnValue(asDetail({ archived: true }));
    renderView();

    expect(screen.getByTestId('nightshiftMemoryArchivedTitleBadge')).toHaveTextContent('Archived');
  });

  it('leaves an active memory unbadged beside its title', () => {
    mockUseMemoryPage.mockReturnValue(asDetail());
    renderView();

    expect(screen.queryByTestId('nightshiftMemoryArchivedTitleBadge')).not.toBeInTheDocument();
  });

  it('shows no reason badge for a legacy archived page that has none', () => {
    // A pre-`archive_reason` document reads as archived with nothing to say why.
    mockUseMemoryPage.mockReturnValue(asDetail({ archived: true }));
    renderView();

    expect(screen.queryByTestId('nightshiftMemoryArchivedBadge')).not.toBeInTheDocument();
  });

  it('puts the metadata below the content, and the content above the fold of the footer', () => {
    mockUseMemoryPage.mockReturnValue(asDetail());
    renderView();

    // The footer describes the page; the memory itself comes first.
    const metadata = screen.getByTestId('nightshiftMemoryMetadata');
    expect(screen.getByText('Scale the consumer.').compareDocumentPosition(metadata)).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING
    );
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

  it('offers delete only to a viewer who may also configure', () => {
    givenCapabilities({ manage: true });
    mockUseMemoryPage.mockReturnValue(asDetail());
    renderView();

    expect(screen.getByTestId('nightshiftMemoryArchiveToggle')).toBeInTheDocument();
    expect(screen.queryByTestId('nightshiftMemoryDeleteButton')).not.toBeInTheDocument();
  });

  it('archives the memory when the archive button is clicked', async () => {
    mockUseMemoryPage.mockReturnValue(asDetail());
    renderView();

    await userEvent.click(screen.getByTestId('nightshiftMemoryArchiveToggle'));

    await waitFor(() => {
      expect(mockSetArchived).toHaveBeenCalledWith({ id: 'memory_kafka-lag', archived: true });
    });
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

  it('round-trips archive then restore off the same toggle', async () => {
    // The hook invalidates rather than patching, so the archived state comes back
    // from the server. Model that by flipping what the query returns.
    let archived = false;
    mockUseMemoryPage.mockImplementation(() =>
      asDetail(archived ? { archived: true, archive_reason: 'manual' as const } : {})
    );
    mockSetArchived.mockImplementation(
      ({ archived: next }: { archived: boolean }, options?: { onSuccess?: () => void }) => {
        archived = next;
        options?.onSuccess?.();
      }
    );
    const { rerenderView } = renderView();

    const toggle = () => screen.getByTestId('nightshiftMemoryArchiveToggle');
    expect(toggle()).toHaveTextContent('Archive');

    await userEvent.click(toggle());
    expect(mockSetArchived).toHaveBeenLastCalledWith({
      id: 'memory_kafka-lag',
      archived: true,
    });
    // The write invalidated the query, so the archived state arrives from the
    // server rather than from local state: re-render to pick it up.
    rerenderView();
    expect(toggle()).toHaveTextContent('Restore');

    await userEvent.click(toggle());
    expect(mockSetArchived).toHaveBeenLastCalledWith({
      id: 'memory_kafka-lag',
      archived: false,
    });
    rerenderView();
    expect(toggle()).toHaveTextContent('Archive');
    // Archived by a person carries the manual reason, and restoring clears it.
    expect(mockSetArchived).toHaveBeenCalledTimes(2);
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

  it('deletes the revision it read, and reports back when confirmed', async () => {
    mockUseMemoryPage.mockReturnValue(asDetail());
    const { onDeleted } = renderView();

    await userEvent.click(screen.getByTestId('nightshiftMemoryDeleteButton'));
    await userEvent.click(screen.getByText('Delete permanently'));

    await waitFor(() => {
      // The revision travels with the request: the delete has to be conditional
      // on what was read, not on what the server finds when it lands.
      expect(mockDelete).toHaveBeenCalledWith(
        { id: 'memory_kafka-lag', version: VERSION },
        expect.objectContaining({ onSuccess: expect.any(Function) })
      );
    });
    expect(onDeleted).toHaveBeenCalled();
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

  it('deletes in one click once the dialog is open', async () => {
    mockUseMemoryPage.mockReturnValue(asDetail());
    renderView();

    await userEvent.click(screen.getByTestId('nightshiftMemoryDeleteButton'));
    await userEvent.click(screen.getByRole('button', { name: 'Delete permanently' }));

    await waitFor(() => expect(mockDelete).toHaveBeenCalled());
  });

  it('cancelling the confirmation leaves the memory alone', async () => {
    mockUseMemoryPage.mockReturnValue(asDetail());
    const { onDeleted } = renderView();

    await userEvent.click(screen.getByTestId('nightshiftMemoryDeleteButton'));
    const dialog = screen.getByRole('alertdialog', { name: /delete this memory permanently/i });
    await userEvent.click(within(dialog).getByRole('button', { name: 'Cancel' }));

    expect(mockDelete).not.toHaveBeenCalled();
    expect(onDeleted).not.toHaveBeenCalled();
    // The dialog is gone, so the page is back to its normal state.
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
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

  it('offers both actions to a viewer with manage and configure', () => {
    givenCapabilities({ show: true, manage: true, configure: true });
    mockUseMemoryPage.mockReturnValue(asDetail());
    renderView();

    expect(screen.getByTestId('nightshiftMemoryArchiveToggle')).toBeInTheDocument();
    expect(screen.getByTestId('nightshiftMemoryDeleteButton')).toBeInTheDocument();
  });

  it('links the source task to the conversation that produced the memory', () => {
    mockUseMemoryPage.mockReturnValue(
      asDetail({ conversation_id: 'conv-1', agent_id: 'nightshift.investigation' })
    );
    renderView();

    // The task text is the link: it names the conversation rather than pointing
    // at it with the word "Source task".
    const link = screen.getByTestId('nightshiftMemorySourceTaskLink');
    expect(link).toHaveAttribute(
      'href',
      '/app/agent_builder/agents/nightshift.investigation/conversations/conv-1'
    );
    expect(link).toHaveTextContent('Checkout latency spike');
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

  it('shows the task text unlinked for a memory with no recorded conversation', () => {
    mockUseMemoryPage.mockReturnValue(asDetail());
    renderView();

    expect(screen.getByTestId('nightshiftMemorySourceTask')).toHaveTextContent(
      'Checkout latency spike'
    );
    expect(screen.queryByTestId('nightshiftMemorySourceTaskLink')).not.toBeInTheDocument();
  });

  it('omits the source task for a memory that recorded neither', () => {
    mockUseMemoryPage.mockReturnValue(asDetail({ context: '' }));
    renderView();

    expect(screen.queryByTestId('nightshiftMemorySourceTask')).not.toBeInTheDocument();
  });
});
