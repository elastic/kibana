/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DataTableRecord } from '@kbn/discover-utils';
import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import TestRenderer, { act } from 'react-test-renderer';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import { createMemoryHistory } from 'history';
import { Router } from '@kbn/shared-ux-router';
import { createStore } from 'redux';
import { AlertFlyoutHeader } from '.';
import type { StartServices } from '../../types';
import { useIsInSecurityApp } from '../../common/hooks/is_in_security_app';
import { DOC_VIEWER_FLYOUT_HISTORY_KEY } from '@kbn/unified-doc-viewer';
import { alertFlyoutHistoryKey } from '../../flyout_v2/document/constants/flyout_history';
import { noopCellActionRenderer } from '../../flyout_v2/shared/components/cell_actions';

const mockDocumentHeader = jest.fn((props: unknown) => {
  const { onShowNotes } = props as { onShowNotes?: () => void };

  return (
    <button type="button" onClick={onShowNotes}>
      {'MockDocumentHeader'}
    </button>
  );
});

jest.mock('../../common/components/user_privileges/user_privileges_context', () => ({
  UserPrivilegesProvider: ({ children }: { children: React.ReactNode }) => children,
}));

jest.mock('../../flyout_v2/document/header', () => ({
  Header: (props: unknown) => mockDocumentHeader(props),
}));

jest.mock('../../flyout_v2/notes', () => ({
  NotesDetails: () => <div>{'MockNotesDetails'}</div>,
}));

jest.mock('../../common/components/user_privileges/user_privileges_context', () => ({
  UserPrivilegesProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

jest.mock('../../common/components/discover_in_timeline/provider', () => ({
  DiscoverInTimelineContextProvider: ({ children }: { children: React.ReactNode }) => (
    <>{children}</>
  ),
}));

jest.mock('../../cases/components/provider/provider', () => ({
  CaseProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

jest.mock('../../assistant/provider', () => ({
  AssistantProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));
jest.mock('../../common/hooks/is_in_security_app', () => ({
  useIsInSecurityApp: jest.fn(),
}));

describe('AlertFlyoutHeader', () => {
  const mockUseIsInSecurityApp = jest.mocked(useIsInSecurityApp);

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseIsInSecurityApp.mockReturnValue(false);
  });

  const servicesMock = {
    overlays: { openSystemFlyout: jest.fn() },
    uiActions: {
      getTriggerCompatibleActions: jest.fn().mockResolvedValue([]),
    },
    application: {
      capabilities: {
        securitySolution: { show: true, crud: true },
      },
    },
    upselling: {},
  } as unknown as StartServices;

  it('wraps the header in KibanaContextProvider and ReactQueryClientProvider', async () => {
    const hit = {
      id: '1',
      raw: { _id: '1', _index: 'test' },
      flattened: {},
    } as unknown as DataTableRecord;
    const store = createStore(() => ({}));
    const storePromise = Promise.resolve(store as never);
    const history = createMemoryHistory({ initialEntries: ['/discover'] });

    let resolveServices: (services: StartServices) => void;
    const servicesPromise = new Promise<StartServices>((resolve) => {
      resolveServices = resolve;
    });

    let tree!: TestRenderer.ReactTestRenderer;
    await act(async () => {
      tree = TestRenderer.create(
        <Router history={history}>
          <AlertFlyoutHeader
            hit={hit}
            servicesPromise={servicesPromise}
            storePromise={storePromise}
            onAlertUpdated={jest.fn()}
          />
        </Router>
      );
    });

    await act(async () => {
      resolveServices(servicesMock);
      await servicesPromise;
      await storePromise;
    });

    expect(tree.root.findAllByType(KibanaContextProvider)).toHaveLength(1);

    const reactQueryProviders = tree.root.findAll((node) => {
      const nodeType = node.type as React.ComponentType;
      return nodeType?.displayName === 'ReactQueryClientProvider';
    });
    expect(reactQueryProviders).toHaveLength(1);
  });

  it('renders under an existing parent router without nesting another router', async () => {
    const hit = {
      id: '1',
      raw: { _id: '1', _index: 'test' },
      flattened: {},
    } as unknown as DataTableRecord;
    const store = createStore(() => ({}));
    const history = createMemoryHistory({ initialEntries: ['/discover'] });

    render(
      <Router history={history}>
        <AlertFlyoutHeader
          hit={hit}
          servicesPromise={Promise.resolve(servicesMock)}
          storePromise={Promise.resolve(store as never)}
          onAlertUpdated={jest.fn()}
        />
      </Router>
    );

    await waitFor(() => {
      expect(screen.getByText('MockDocumentHeader')).toBeInTheDocument();
    });
  });

  it('renders shared document header in Discover', async () => {
    const hit = {
      id: '1',
      raw: { _id: '1', _index: 'test' },
      flattened: {},
    } as unknown as DataTableRecord;
    const store = createStore(() => ({}));
    const history = createMemoryHistory({ initialEntries: ['/discover'] });

    render(
      <Router history={history}>
        <AlertFlyoutHeader
          hit={hit}
          servicesPromise={Promise.resolve(servicesMock)}
          storePromise={Promise.resolve(store as never)}
          onAlertUpdated={jest.fn()}
        />
      </Router>
    );

    await waitFor(() => {
      expect(screen.getByText('MockDocumentHeader')).toBeInTheDocument();
    });

    expect(mockDocumentHeader).toHaveBeenCalledWith(expect.objectContaining({ hit }));
  });

  it('passes a Discover-aware cell action renderer to the header', async () => {
    const hit = {
      id: '1',
      raw: { _id: '1', _index: 'test' },
      flattened: {},
    } as unknown as DataTableRecord;
    const store = createStore(() => ({}));
    const history = createMemoryHistory({ initialEntries: ['/discover'] });

    render(
      <Router history={history}>
        <AlertFlyoutHeader
          hit={hit}
          servicesPromise={Promise.resolve(servicesMock)}
          storePromise={Promise.resolve(store as never)}
          onAlertUpdated={jest.fn()}
          columns={['host.name']}
          filter={jest.fn()}
          onAddColumn={jest.fn()}
          onRemoveColumn={jest.fn()}
        />
      </Router>
    );

    await waitFor(() => {
      expect(screen.getByText('MockDocumentHeader')).toBeInTheDocument();
    });

    expect(mockDocumentHeader).toHaveBeenCalledWith(
      expect.objectContaining({
        renderCellActions: expect.any(Function),
      })
    );

    const lastCall = mockDocumentHeader.mock.calls[mockDocumentHeader.mock.calls.length - 1];
    const lastProps = lastCall?.[0] as { renderCellActions?: unknown } | undefined;
    const renderCellActions = lastProps?.renderCellActions;
    expect(renderCellActions).not.toBe(noopCellActionRenderer);
  });

  it('opens notes in a nested system flyout from Discover header', async () => {
    const hit = { id: '1', raw: { _id: '1' }, flattened: {} } as unknown as DataTableRecord;
    const store = createStore(() => ({}));
    const history = createMemoryHistory({ initialEntries: ['/discover'] });

    render(
      <Router history={history}>
        <AlertFlyoutHeader
          hit={hit}
          servicesPromise={Promise.resolve(servicesMock)}
          storePromise={Promise.resolve(store as never)}
          onAlertUpdated={jest.fn()}
        />
      </Router>
    );

    await waitFor(() => {
      expect(screen.getByText('MockDocumentHeader')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('MockDocumentHeader'));

    expect(servicesMock.overlays.openSystemFlyout).toHaveBeenCalledTimes(1);
    expect(servicesMock.overlays.openSystemFlyout).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        historyKey: DOC_VIEWER_FLYOUT_HISTORY_KEY,
        ownFocus: false,
        resizable: true,
        size: 'm',
      })
    );
  });

  it('uses Security history key when opened inside Security app', async () => {
    mockUseIsInSecurityApp.mockReturnValue(true);

    const hit = { id: '1', raw: { _id: '1' }, flattened: {} } as unknown as DataTableRecord;
    const store = createStore(() => ({}));
    const history = createMemoryHistory({ initialEntries: ['/security'] });

    render(
      <Router history={history}>
        <AlertFlyoutHeader
          hit={hit}
          servicesPromise={Promise.resolve(servicesMock)}
          storePromise={Promise.resolve(store as never)}
          onAlertUpdated={jest.fn()}
        />
      </Router>
    );

    await waitFor(() => {
      expect(screen.getByText('MockDocumentHeader')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('MockDocumentHeader'));

    expect(servicesMock.overlays.openSystemFlyout).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        historyKey: alertFlyoutHistoryKey,
      })
    );
  });

  it('shows a callout when _id or _index are missing from hit.raw', async () => {
    const hit = { id: '1', raw: {}, flattened: {} } as unknown as DataTableRecord;
    const store = createStore(() => ({}));
    const history = createMemoryHistory({ initialEntries: ['/discover'] });

    render(
      <Router history={history}>
        <AlertFlyoutHeader
          hit={hit}
          servicesPromise={Promise.resolve(servicesMock)}
          storePromise={Promise.resolve(store as never)}
          onAlertUpdated={jest.fn()}
        />
      </Router>
    );

    await waitFor(() => {
      expect(
        screen.getByText(
          'Some of the content below might not be loading correctly. To ensure the best experience, please add `METADATA _id,_index` to your query.'
        )
      ).toBeInTheDocument();
    });
  });

  it('shows a callout when _index is a remote (CCS) index', async () => {
    const hit = {
      id: '1',
      raw: { _id: '1', _index: 'remote-cluster:.alerts-security.alerts-default' },
      flattened: {},
    } as unknown as DataTableRecord;
    const store = createStore(() => ({}));
    const history = createMemoryHistory({ initialEntries: ['/discover'] });

    render(
      <Router history={history}>
        <AlertFlyoutHeader
          hit={hit}
          servicesPromise={Promise.resolve(servicesMock)}
          storePromise={Promise.resolve(store as never)}
          onAlertUpdated={jest.fn()}
        />
      </Router>
    );

    await waitFor(() => {
      expect(
        screen.getByText(
          'This event originates from a remote cluster. Some features may not be available.'
        )
      ).toBeInTheDocument();
    });
  });

  it('does not show the callout when both _id and _index are present in hit.raw', async () => {
    const hit = {
      id: '1',
      raw: { _id: '1', _index: 'test' },
      flattened: {},
    } as unknown as DataTableRecord;
    const store = createStore(() => ({}));
    const history = createMemoryHistory({ initialEntries: ['/discover'] });

    render(
      <Router history={history}>
        <AlertFlyoutHeader
          hit={hit}
          servicesPromise={Promise.resolve(servicesMock)}
          storePromise={Promise.resolve(store as never)}
          onAlertUpdated={jest.fn()}
        />
      </Router>
    );

    await waitFor(() => {
      expect(screen.getByText('MockDocumentHeader')).toBeInTheDocument();
    });

    expect(
      screen.queryByText(
        'Some of the content below might not be loading correctly. To ensure the best experience, please add `METADATA _id,_index` to your query.'
      )
    ).not.toBeInTheDocument();
  });
});
