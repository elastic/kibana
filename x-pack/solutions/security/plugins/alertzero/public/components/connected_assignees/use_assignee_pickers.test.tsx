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
        <span data-test-subj={`updating-${conversationId}`}>{isUpdating ? 'updating' : 'idle'}</span>
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

const renderHookInProviders = (hook: () => React.ReactNode, items: TestItem[]) => {
  const core = coreMock.createStart();
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });

  // A thin wrapper component that calls the hook and renders the picker for each item.
  const Wrapper: React.FC<{ items: TestItem[] }> = ({ items: currentItems }) => {
    const renderPicker = hook() as (item: TestItem) => React.ReactNode;
    return (
      <>
        {currentItems.map((item) => (
          <React.Fragment key={item.id}>{renderPicker(item)}</React.Fragment>
        ))}
      </>
    );
  };

  // Capture the rerender function so tests can update items.
  let rerender: (newItems: TestItem[]) => void;
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
  rerender = (newItems: TestItem[]) =>
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

  return { core, rerender };
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
  // We need a stable hook identity per test; use a closure.
  const opts = { items, assign, refresh, canManage, isReadOnly };
  return {
    assignMock: assign,
    refreshMock: refresh,
    hook: () =>
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
      }),
  };
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
    const { hook } = makeHook(items);
    renderHookInProviders(hook, items);
    expect(screen.getByTestId('updating-item-1')).toHaveTextContent('idle');
  });

  it('shows updating while the mutation is in flight', async () => {
    let resolveAssign!: () => void;
    const assign = jest.fn(
      () => new Promise<{}>((res) => { resolveAssign = () => res({}); })
    );
    const items = [makeItem('item-1')];
    const { hook } = makeHook(items, { assign });
    renderHookInProviders(hook, items);

    fireEvent.click(screen.getByTestId('assign-item-1'));

    expect(screen.getByTestId('updating-item-1')).toHaveTextContent('updating');

    await act(async () => { resolveAssign(); });
    await waitFor(() =>
      expect(screen.getByTestId('updating-item-1')).toHaveTextContent('idle')
    );
  });

  it('clears pending and shows idle after a successful mutation', async () => {
    const items = [makeItem('item-1')];
    const { hook } = makeHook(items);
    renderHookInProviders(hook, items);

    fireEvent.click(screen.getByTestId('assign-item-1'));
    await waitFor(() =>
      expect(screen.getByTestId('updating-item-1')).toHaveTextContent('idle')
    );
  });

  it('awaits refresh before clearing pending (regression: stuck picker)', async () => {
    let resolveRefresh!: () => void;
    const refresh = jest.fn(
      () => new Promise<void>((res) => { resolveRefresh = () => res(); })
    );
    const items = [makeItem('item-1')];
    const { hook } = makeHook(items, { refresh });
    renderHookInProviders(hook, items);

    fireEvent.click(screen.getByTestId('assign-item-1'));

    // assign resolved, but refresh is still pending → still updating
    await waitFor(() => expect(refresh).toHaveBeenCalledTimes(1));
    expect(screen.getByTestId('updating-item-1')).toHaveTextContent('updating');

    await act(async () => { resolveRefresh(); });
    await waitFor(() =>
      expect(screen.getByTestId('updating-item-1')).toHaveTextContent('idle')
    );
  });

  it('shows a success toast and calls refresh exactly once on success', async () => {
    const items = [makeItem('item-1')];
    const refresh = jest.fn().mockResolvedValue(undefined);
    const { hook, core } = (() => {
      // Capture core for toast assertions.
      const c = coreMock.createStart();
      const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
      const opts = {
        items,
        assign: jest.fn().mockResolvedValue({}),
        refresh,
        canManage: true,
        isReadOnly: undefined as undefined,
      };
      const Wrapper: React.FC = () => {
        const renderPicker = useAssigneePickers({
          items: opts.items,
          getRowKey: (item) => (item as TestItem).id,
          getTargetId: (item) => (item as TestItem).targetId,
          getAssigneeUids: (item) => (item as TestItem).assigneeUids,
          assign: opts.assign,
          refresh: opts.refresh,
          canManage: opts.canManage,
          labels: { assignSuccess: 'Assignees updated', assignError: 'Failed' },
        });
        return (
          <>
            {items.map((item) => (
              <React.Fragment key={item.id}>{renderPicker(item)}</React.Fragment>
            ))}
          </>
        );
      };
      render(
        <I18nProvider>
          <EuiProvider>
            <KibanaContextProvider services={c}>
              <QueryClientProvider client={queryClient}>
                <Wrapper />
              </QueryClientProvider>
            </KibanaContextProvider>
          </EuiProvider>
        </I18nProvider>
      );
      return { hook: null, core: c };
    })();

    fireEvent.click(screen.getByTestId('assign-item-1'));

    await waitFor(() =>
      expect(core.notifications.toasts.addSuccess).toHaveBeenCalledWith('Assignees updated')
    );
    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it('rolls back pending and shows a danger toast on error', async () => {
    const assign = jest.fn().mockRejectedValue(new Error('Network error'));
    const items = [makeItem('item-1')];
    const { hook } = makeHook(items, { assign });
    const { core } = renderHookInProviders(hook, items);

    fireEvent.click(screen.getByTestId('assign-item-1'));

    await waitFor(() =>
      expect(core.notifications.toasts.addDanger).toHaveBeenCalledWith('Failed to update assignees')
    );
    expect(screen.getByTestId('updating-item-1')).toHaveTextContent('idle');
  });

  it('does not call refresh for a self-bump (no double-refresh)', async () => {
    const refresh = jest.fn().mockResolvedValue(undefined);
    const items = [makeItem('item-1', 'target-1')];
    const { hook } = makeHook(items, { refresh });
    renderHookInProviders(hook, items);

    fireEvent.click(screen.getByTestId('assign-item-1'));

    await waitFor(() =>
      expect(screen.getByTestId('updating-item-1')).toHaveTextContent('idle')
    );
    // refresh called exactly once (from handleChange), not twice (not again from the signal).
    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it('calls refresh when an external bump targets a visible item', async () => {
    const refresh = jest.fn().mockResolvedValue(undefined);
    const items = [makeItem('item-1', 'target-1')];
    const { hook } = makeHook(items, { refresh });
    renderHookInProviders(hook, items);

    act(() => {
      assigneeSignal.bump('target-1');
    });

    await waitFor(() => expect(refresh).toHaveBeenCalledTimes(1));
  });

  it('does not call refresh when an external bump targets a non-visible item', async () => {
    const refresh = jest.fn().mockResolvedValue(undefined);
    const items = [makeItem('item-1', 'target-1')];
    const { hook } = makeHook(items, { refresh });
    renderHookInProviders(hook, items);

    act(() => {
      assigneeSignal.bump('target-OTHER');
    });

    // Give React time to process the signal.
    await new Promise((r) => setTimeout(r, 50));
    expect(refresh).not.toHaveBeenCalled();
  });

  it('renders read-only when isReadOnly returns true', () => {
    const items = [makeItem('item-1')];
    const { hook } = makeHook(items, { isReadOnly: () => true });
    renderHookInProviders(hook, items);
    expect(screen.queryByTestId('assign-item-1')).not.toBeInTheDocument();
  });

  it('renders read-only when canManage is false', () => {
    const items = [makeItem('item-1')];
    const { hook } = makeHook(items, { canManage: false });
    renderHookInProviders(hook, items);
    expect(screen.queryByTestId('assign-item-1')).not.toBeInTheDocument();
  });
});
