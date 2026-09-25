/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { EuiProvider } from '@elastic/eui';
import { I18nProvider } from '@kbn/i18n-react';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import { coreMock } from '@kbn/core/public/mocks';
import { useUserProfiles, useSuggestUserProfiles } from '@kbn/agentic-investigations-plugin/public';
import { assigneeSignal } from './assignee_overrides';
import { useAssigneePickers } from './use_assignee_pickers';

jest.mock('@kbn/agentic-investigations-plugin/public', () => ({
  ...jest.requireActual('@kbn/agentic-investigations-plugin/public'),
  useUserProfiles: jest.fn(),
  useSuggestUserProfiles: jest.fn(),
}));

// Replace AssignToUsers with a minimal stub so we can drive onChange directly.
jest.mock('@kbn/agentic-investigations-common', () => {
  const actual = jest.requireActual('@kbn/agentic-investigations-common');
  return {
    ...actual,
    // eslint-disable-next-line react/display-name
    AssignToUsers: ({
      conversationId,
      onChange,
      canManage,
      isUpdating,
    }: {
      conversationId: string;
      onChange: (s: unknown[]) => void;
      canManage: boolean;
      isUpdating: boolean;
    }) => (
      <div>
        <span data-test-subj={`updating-${conversationId}`}>
          {isUpdating ? 'updating' : 'idle'}
        </span>
        {canManage && (
          <button
            data-test-subj={`assign-${conversationId}`}
            onClick={() =>
              onChange([{ uid: 'user-1', enabled: true, user: { username: 'alice' }, data: {} }])
            }
          >
            Assign
          </button>
        )}
      </div>
    ),
  };
});

const mockUseUserProfiles = useUserProfiles as jest.Mock;
const mockUseSuggestUserProfiles = useSuggestUserProfiles as jest.Mock;

interface TestItem {
  id: string;
  targetId: string;
  assigneeUids: string[];
}

const makeItem = (id: string, targetId = id): TestItem => ({
  id,
  targetId,
  assigneeUids: [],
});

// ---------------------------------------------------------------------------
// Provider wrapper helpers
// ---------------------------------------------------------------------------

const makeProviders = () => ({
  core: coreMock.createStart(),
  queryClient: new QueryClient({ defaultOptions: { queries: { retry: false } } }),
});

type RenderPicker = (item: TestItem) => React.ReactNode;

const renderWithProviders = (
  core: ReturnType<typeof coreMock.createStart>,
  queryClient: QueryClient,
  hook: () => RenderPicker,
  items: TestItem[]
) => {
  const Wrapper: React.FC<{ items: TestItem[] }> = ({ items: currentItems }) => {
    const renderPicker = hook();
    return (
      <>
        {currentItems.map((item) => (
          <React.Fragment key={item.id}>{renderPicker(item)}</React.Fragment>
        ))}
      </>
    );
  };

  const { rerender: rtlRerender } = render(
    <I18nProvider>
      <EuiProvider>
        <KibanaContextProvider services={core}>
          <QueryClientProvider client={queryClient}>
            <Wrapper items={items} />
          </QueryClientProvider>
        </KibanaContextProvider>
      </EuiProvider>
    </I18nProvider>
  );

  const rerender = (newItems: TestItem[]) =>
    rtlRerender(
      <I18nProvider>
        <EuiProvider>
          <KibanaContextProvider services={core}>
            <QueryClientProvider client={queryClient}>
              <Wrapper items={newItems} />
            </QueryClientProvider>
          </KibanaContextProvider>
        </EuiProvider>
      </I18nProvider>
    );

  return { rerender };
};

// ---------------------------------------------------------------------------
// Shared test fixture
// ---------------------------------------------------------------------------

const makeHook = (
  items: TestItem[],
  {
    assign = jest.fn().mockResolvedValue({}),
    refresh = jest.fn().mockResolvedValue(undefined),
    canManage = true,
    isReadOnly,
  }: {
    assign?: jest.Mock;
    refresh?: jest.Mock;
    canManage?: boolean;
    isReadOnly?: (item: TestItem) => boolean;
  } = {}
) => {
  const opts = { items, assign, refresh, canManage, isReadOnly };
  const hook = (): RenderPicker =>
    // eslint-disable-next-line react-hooks/rules-of-hooks
    useAssigneePickers({
      items: opts.items,
      getRowKey: (item) => item.id,
      getTargetId: (item) => item.targetId,
      getAssigneeUids: (item) => item.assigneeUids,
      assign: opts.assign,
      refresh: opts.refresh,
      canManage: opts.canManage,
      isReadOnly: opts.isReadOnly,
      labels: { assignSuccess: 'Assignees updated', assignError: 'Failed to update assignees' },
    });
  return { hook, assign, refresh };
};

const setup = (items: TestItem[], overrides: Parameters<typeof makeHook>[1] = {}) => {
  const { core, queryClient } = makeProviders();
  const { hook, assign, refresh } = makeHook(items, overrides);
  const { rerender } = renderWithProviders(core, queryClient, hook, items);
  return { core, rerender, assign, refresh };
};

// ---------------------------------------------------------------------------

beforeEach(() => {
  mockUseUserProfiles.mockReturnValue({ data: [], isFetching: false });
  mockUseSuggestUserProfiles.mockReturnValue({ data: [], isLoading: false });
});

afterEach(() => jest.clearAllMocks());

describe('useAssigneePickers', () => {
  it('renders as idle before any interaction', () => {
    const items = [makeItem('item-1')];
    setup(items);
    expect(screen.getByTestId('updating-item-1')).toHaveTextContent('idle');
  });

  it('shows updating while the mutation is in flight', async () => {
    let resolveAssign!: () => void;
    const assign = jest.fn(
      () =>
        new Promise<{}>((res) => {
          resolveAssign = () => res({});
        })
    );
    const items = [makeItem('item-1')];
    setup(items, { assign });

    fireEvent.click(screen.getByTestId('assign-item-1'));
    expect(screen.getByTestId('updating-item-1')).toHaveTextContent('updating');

    await act(async () => {
      resolveAssign();
    });
    await waitFor(() => expect(screen.getByTestId('updating-item-1')).toHaveTextContent('idle'));
  });

  it('clears pending and shows idle after a successful mutation', async () => {
    const items = [makeItem('item-1')];
    setup(items);

    fireEvent.click(screen.getByTestId('assign-item-1'));
    await waitFor(() => expect(screen.getByTestId('updating-item-1')).toHaveTextContent('idle'));
  });

  it('awaits refresh before clearing pending (regression: stuck picker)', async () => {
    let resolveRefresh!: () => void;
    const refresh = jest.fn(
      () =>
        new Promise<void>((res) => {
          resolveRefresh = () => res();
        })
    );
    const items = [makeItem('item-1')];
    setup(items, { refresh });

    fireEvent.click(screen.getByTestId('assign-item-1'));

    // assign resolved, but refresh is still pending → still updating
    await waitFor(() => expect(refresh).toHaveBeenCalledTimes(1));
    expect(screen.getByTestId('updating-item-1')).toHaveTextContent('updating');

    await act(async () => {
      resolveRefresh();
    });
    await waitFor(() => expect(screen.getByTestId('updating-item-1')).toHaveTextContent('idle'));
  });

  it('shows a success toast after a successful mutation', async () => {
    const items = [makeItem('item-1')];
    const { core } = setup(items);

    fireEvent.click(screen.getByTestId('assign-item-1'));

    await waitFor(() =>
      expect(core.notifications.toasts.addSuccess).toHaveBeenCalledWith('Assignees updated')
    );
  });

  it('calls refresh exactly once on success (not twice via self-bump)', async () => {
    const refresh = jest.fn().mockResolvedValue(undefined);
    const items = [makeItem('item-1', 'target-1')];
    setup(items, { refresh });

    fireEvent.click(screen.getByTestId('assign-item-1'));

    await waitFor(() => expect(screen.getByTestId('updating-item-1')).toHaveTextContent('idle'));
    // refresh called once from handleChange; the self-bump suppresses the signal handler.
    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it('rolls back pending and shows a danger toast on error', async () => {
    const assign = jest.fn().mockRejectedValue(new Error('Network error'));
    const items = [makeItem('item-1')];
    const { core } = setup(items, { assign });

    fireEvent.click(screen.getByTestId('assign-item-1'));

    await waitFor(() =>
      expect(core.notifications.toasts.addDanger).toHaveBeenCalledWith('Failed to update assignees')
    );
    expect(screen.getByTestId('updating-item-1')).toHaveTextContent('idle');
  });

  it('calls refresh when an external bump targets a visible item', async () => {
    const refresh = jest.fn().mockResolvedValue(undefined);
    const items = [makeItem('item-1', 'target-1')];
    setup(items, { refresh });

    act(() => {
      assigneeSignal.bump('target-1');
    });

    await waitFor(() => expect(refresh).toHaveBeenCalledTimes(1));
  });

  it('does not call refresh when an external bump targets a non-visible item', async () => {
    const refresh = jest.fn().mockResolvedValue(undefined);
    const items = [makeItem('item-1', 'target-1')];
    setup(items, { refresh });

    act(() => {
      assigneeSignal.bump('target-OTHER');
    });

    // Give React time to process the signal.
    await new Promise((r) => setTimeout(r, 50));
    expect(refresh).not.toHaveBeenCalled();
  });

  it('renders read-only when isReadOnly returns true', () => {
    const items = [makeItem('item-1')];
    setup(items, { isReadOnly: () => true });
    expect(screen.queryByTestId('assign-item-1')).not.toBeInTheDocument();
  });

  it('renders read-only when canManage is false', () => {
    const items = [makeItem('item-1')];
    setup(items, { canManage: false });
    expect(screen.queryByTestId('assign-item-1')).not.toBeInTheDocument();
  });
});
