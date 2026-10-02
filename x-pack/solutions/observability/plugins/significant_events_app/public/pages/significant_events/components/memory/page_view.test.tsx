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
// The lineage component issues its own fetch; stub it so these tests stay about
// the page's own actions.
jest.mock('./lineage', () => ({
  MemoryLineage: () => <div data-test-subj="nightshiftMemoryLineage" />,
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
const mockSetArchived = jest.fn();
const mockDelete = jest.fn();
const mockUseSetArchived = useSetMemoryArchived as jest.MockedFunction<typeof useSetMemoryArchived>;
const mockUseDelete = useDeleteMemoryPage as jest.MockedFunction<typeof useDeleteMemoryPage>;

const page = (overrides: Partial<MemoryPage> = {}): MemoryPage => ({
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
  telemetry: { impressions: 10, conversions: 5, last_impression_time: '2026-01-01T00:00:00.000Z' },
  ...overrides,
});

const asDetail = (
  overrides: Partial<MemoryPage> = {},
  data = { usefulness: 0.5, confidence: 0.8 }
) =>
  ({
    isLoading: false,
    isError: false,
    data: { page: page(overrides), ...data },
  } as unknown as ReturnType<typeof useMemoryPage>);

const renderView = (onDeleted = jest.fn(), onSelectPage = jest.fn()) => {
  render(
    <I18nProvider>
      <MemoryPageView pageId="memory_kafka-lag" onSelectPage={onSelectPage} onDeleted={onDeleted} />
    </I18nProvider>
  );
  return { onDeleted, onSelectPage };
};

beforeEach(() => {
  jest.clearAllMocks();
  givenCapabilities({ manage: true, configure: true });
  mockUseSetArchived.mockReturnValue(mockSetArchived);
  mockUseDelete.mockReturnValue(mockDelete);
  mockSetArchived.mockResolvedValue(undefined);
  mockDelete.mockResolvedValue(undefined);
});

describe('MemoryPageView', () => {
  it('renders the title, usefulness and confidence returned by the route', () => {
    mockUseMemoryPage.mockReturnValue(asDetail({}, { usefulness: 0.75, confidence: 0.6 }));
    renderView();

    expect(screen.getByTestId('nightshiftMemoryPageTitle')).toHaveTextContent('Kafka consumer lag');
    // Usefulness and confidence are the two displayed numbers, computed
    // server-side so the UI and the model see the same values.
    expect(screen.getByText('Usefulness').parentElement).toHaveTextContent('75%');
    expect(screen.getByText('Confidence').parentElement).toHaveTextContent('60%');
  });

  it('shows the task the memory was learned from', () => {
    mockUseMemoryPage.mockReturnValue(asDetail());
    renderView();
    expect(screen.getByTestId('nightshiftMemoryContext')).toHaveTextContent(
      'Checkout latency spike'
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
      expect(mockSetArchived).toHaveBeenCalledWith('memory_kafka-lag', true);
    });
  });

  it('restores an archived memory rather than re-archiving it', async () => {
    mockUseMemoryPage.mockReturnValue(asDetail({ archived: true, archive_reason: 'harmful' }));
    renderView();

    expect(screen.getByTestId('nightshiftMemoryArchivedBadge')).toBeInTheDocument();
    await userEvent.click(screen.getByTestId('nightshiftMemoryArchiveToggle'));

    await waitFor(() => {
      expect(mockSetArchived).toHaveBeenCalledWith('memory_kafka-lag', false);
    });
  });

  it('round-trips archive then restore off the same toggle', async () => {
    // The hook invalidates rather than patching, so the archived state comes back
    // from the server. Model that by flipping what the query returns.
    let archived = false;
    mockUseMemoryPage.mockImplementation(() =>
      asDetail(archived ? { archived: true, archive_reason: 'manual' as const } : {})
    );
    mockSetArchived.mockImplementation(async (_id: string, next: boolean) => {
      archived = next;
    });
    renderView();

    const toggle = () => screen.getByTestId('nightshiftMemoryArchiveToggle');
    expect(toggle()).toHaveTextContent('Archive');

    await userEvent.click(toggle());
    await waitFor(() => expect(toggle()).toHaveTextContent('Restore'));
    expect(mockSetArchived).toHaveBeenLastCalledWith('memory_kafka-lag', true);

    await userEvent.click(toggle());
    await waitFor(() => expect(toggle()).toHaveTextContent('Archive'));
    expect(mockSetArchived).toHaveBeenLastCalledWith('memory_kafka-lag', false);
    // Archived by a person carries the manual reason, and restoring clears it.
    expect(mockSetArchived).toHaveBeenCalledTimes(2);
  });

  it('surfaces a failed restore rather than reporting the memory as active', async () => {
    mockUseMemoryPage.mockReturnValue(asDetail({ archived: true, archive_reason: 'manual' }));
    mockSetArchived.mockRejectedValue(new Error('version conflict'));
    renderView();

    await userEvent.click(screen.getByTestId('nightshiftMemoryArchiveToggle'));

    // The page on screen is unchanged, so the operator has to know the write failed
    // rather than see a stale "archived" badge and assume it worked.
    await waitFor(() => {
      expect(screen.getByTestId('nightshiftMemoryActionError')).toHaveTextContent(
        'version conflict'
      );
    });
    expect(screen.getByTestId('nightshiftMemoryArchivedBadge')).toBeInTheDocument();
  });

  it('does not delete without an explicit confirmation', async () => {
    mockUseMemoryPage.mockReturnValue(asDetail());
    renderView();

    await userEvent.click(screen.getByTestId('nightshiftMemoryDeleteButton'));
    // The dialog is open, but nothing has been deleted yet.
    expect(screen.getByTestId('nightshiftMemoryDeleteConfirm')).toBeInTheDocument();
    expect(mockDelete).not.toHaveBeenCalled();
  });

  it('deletes with the page title and reports back when confirmed', async () => {
    mockUseMemoryPage.mockReturnValue(asDetail());
    const { onDeleted } = renderView();

    await userEvent.click(screen.getByTestId('nightshiftMemoryDeleteButton'));
    await userEvent.type(
      screen.getByTestId('nightshiftMemoryDeleteConfirmTitle'),
      'Kafka consumer lag'
    );
    await userEvent.click(screen.getByText('Delete permanently'));

    await waitFor(() => {
      // The title is echoed so the route can refuse a stale confirmation.
      expect(mockDelete).toHaveBeenCalledWith('memory_kafka-lag', 'Kafka consumer lag');
    });
    expect(onDeleted).toHaveBeenCalled();
  });

  it('keeps the destructive button disabled until the exact title is typed', async () => {
    mockUseMemoryPage.mockReturnValue(asDetail());
    renderView();

    await userEvent.click(screen.getByTestId('nightshiftMemoryDeleteButton'));
    const confirm = () => screen.getByRole('button', { name: 'Delete permanently' });
    const field = screen.getByTestId('nightshiftMemoryDeleteConfirmTitle');

    // Deleting is irreversible, so a reflexive click cannot destroy content: the
    // operator has to name the memory first.
    expect(confirm()).toBeDisabled();

    // A near miss is still a miss — the route compares the whole title.
    await userEvent.type(field, 'Kafka consumer lag ');
    expect(confirm()).toBeDisabled();
    expect(mockDelete).not.toHaveBeenCalled();

    await userEvent.clear(field);
    await userEvent.type(field, 'Kafka consumer lag');
    expect(confirm()).toBeEnabled();

    await userEvent.click(confirm());
    await waitFor(() => expect(mockDelete).toHaveBeenCalled());
  });

  it('clears the typed title when the confirmation is cancelled', async () => {
    mockUseMemoryPage.mockReturnValue(asDetail());
    renderView();

    await userEvent.click(screen.getByTestId('nightshiftMemoryDeleteButton'));
    await userEvent.type(
      screen.getByTestId('nightshiftMemoryDeleteConfirmTitle'),
      'Kafka consumer lag'
    );
    const dialog = screen.getByRole('alertdialog', { name: /delete this memory permanently/i });
    await userEvent.click(within(dialog).getByRole('button', { name: /closes this modal/i }));

    // Reopening must not leave a stale confirmation armed from the last attempt.
    await userEvent.click(screen.getByTestId('nightshiftMemoryDeleteButton'));
    expect(screen.getByTestId('nightshiftMemoryDeleteConfirmTitle')).toHaveValue('');
    expect(screen.getByRole('button', { name: 'Delete permanently' })).toBeDisabled();
  });

  it('cancelling the confirmation leaves the memory alone', async () => {
    mockUseMemoryPage.mockReturnValue(asDetail());
    const { onDeleted } = renderView();

    await userEvent.click(screen.getByTestId('nightshiftMemoryDeleteButton'));
    // The dialog is reachable as a labelled alertdialog, and its close affordance
    // is an icon button that only screen readers can name.
    const dialog = screen.getByRole('alertdialog', { name: /delete this memory permanently/i });
    await userEvent.click(within(dialog).getByRole('button', { name: /closes this modal/i }));

    expect(mockDelete).not.toHaveBeenCalled();
    expect(onDeleted).not.toHaveBeenCalled();
    // The dialog is gone, so the page is back to its normal state.
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
  });

  it('surfaces a failed action instead of silently retrying', async () => {
    mockSetArchived.mockRejectedValue(new Error('version conflict'));
    mockUseMemoryPage.mockReturnValue(asDetail());
    renderView();

    await userEvent.click(screen.getByTestId('nightshiftMemoryArchiveToggle'));

    // The optimizer writes asynchronously, so a conflict is a real outcome the
    // operator has to see rather than have retried behind their back.
    await waitFor(() => {
      expect(screen.getByTestId('nightshiftMemoryActionError')).toHaveTextContent(
        'version conflict'
      );
    });
    // One attempt, not a retry loop: the store already exhausted its own OCC
    // retries, and the UI must not paper over that with another one.
    expect(mockSetArchived).toHaveBeenCalledTimes(1);
  });

  it('surfaces a failed delete and leaves the page in place', async () => {
    mockDelete.mockRejectedValue(new Error('version conflict'));
    mockUseMemoryPage.mockReturnValue(asDetail());
    const { onDeleted } = renderView();

    await userEvent.click(screen.getByTestId('nightshiftMemoryDeleteButton'));
    await userEvent.type(
      screen.getByTestId('nightshiftMemoryDeleteConfirmTitle'),
      'Kafka consumer lag'
    );
    await userEvent.click(screen.getByText('Delete permanently'));

    await waitFor(() => {
      expect(screen.getByTestId('nightshiftMemoryActionError')).toHaveTextContent(
        'version conflict'
      );
    });
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

  it('links to the conversation that produced the memory', () => {
    mockUseMemoryPage.mockReturnValue(
      asDetail({ conversation_id: 'conv-1', agent_id: 'nightshift.investigation' })
    );
    renderView();

    expect(screen.getByTestId('nightshiftMemorySourceTaskLink')).toHaveAttribute(
      'href',
      '/app/agent_builder/agents/nightshift.investigation/conversations/conv-1'
    );
  });

  it('omits the source-task link for a memory with no recorded conversation', () => {
    mockUseMemoryPage.mockReturnValue(asDetail());
    renderView();

    expect(screen.queryByTestId('nightshiftMemorySourceTaskLink')).not.toBeInTheDocument();
  });
});
