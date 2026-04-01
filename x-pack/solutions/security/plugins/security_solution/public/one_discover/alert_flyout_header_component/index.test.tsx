/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DataTableRecord } from '@kbn/discover-utils';
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import TestRenderer, { act } from 'react-test-renderer';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import { ElasticRequestState } from '@kbn/unified-doc-viewer';
import { useEsDocSearch } from '@kbn/unified-doc-viewer-plugin/public';
import { createMemoryHistory } from 'history';
import { Router } from '@kbn/shared-ux-router';
import { createStore } from 'redux';
import { AlertFlyoutHeader } from '.';
import type { StartServices } from '../../types';

const mockDocumentHeader = jest.fn((_props: unknown) => <div>{'MockDocumentHeader'}</div>);
const mockRefetchDocument = jest.fn();

jest.mock('../../common/components/user_privileges/user_privileges_context', () => ({
  UserPrivilegesProvider: ({ children }: { children: React.ReactNode }) => children,
}));

jest.mock('../../flyout_v2/document/header', () => ({
  Header: (props: unknown) => mockDocumentHeader(props),
}));
jest.mock('@kbn/unified-doc-viewer-plugin/public');

jest.mock('../../common/components/user_privileges/user_privileges_context', () => ({
  UserPrivilegesProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

jest.mock('../../common/components/discover_in_timeline/provider', () => ({
  DiscoverInTimelineContextProvider: ({ children }: { children: React.ReactNode }) => (
    <>{children}</>
  ),
}));

describe('AlertFlyoutHeader', () => {
  beforeEach(() => {
    mockDocumentHeader.mockClear();
    mockRefetchDocument.mockClear();
    (useEsDocSearch as jest.Mock).mockReturnValue([
      ElasticRequestState.Loading,
      null,
      mockRefetchDocument,
    ]);
  });

  const servicesMock = {
    core: { overlays: {} },
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
    const hit = { id: '1', raw: {}, flattened: {} } as unknown as DataTableRecord;
    const dataView = {} as never;
    const store = createStore(() => ({}));
    const storePromise = Promise.resolve(store as never);

    let resolveServices: (services: StartServices) => void;
    const servicesPromise = new Promise<StartServices>((resolve) => {
      resolveServices = resolve;
    });

    let tree!: TestRenderer.ReactTestRenderer;
    await act(async () => {
      tree = TestRenderer.create(
        <AlertFlyoutHeader
          hit={hit}
          dataView={dataView}
          servicesPromise={servicesPromise}
          storePromise={storePromise}
        />
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
    const hit = { id: '1', raw: {}, flattened: {} } as unknown as DataTableRecord;
    const dataView = {} as never;
    const store = createStore(() => ({}));
    const history = createMemoryHistory({ initialEntries: ['/discover'] });

    render(
      <Router history={history}>
        <AlertFlyoutHeader
          hit={hit}
          dataView={dataView}
          servicesPromise={Promise.resolve(servicesMock)}
          storePromise={Promise.resolve(store as never)}
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
      raw: { _id: 'alert-1', _index: 'alerts-index' },
      flattened: {},
    } as unknown as DataTableRecord;
    const dataView = {} as never;
    const store = createStore(() => ({}));

    render(
      <AlertFlyoutHeader
        hit={hit}
        dataView={dataView}
        servicesPromise={Promise.resolve(servicesMock)}
        storePromise={Promise.resolve(store as never)}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('MockDocumentHeader')).toBeInTheDocument();
    });

    expect(mockDocumentHeader).toHaveBeenCalledWith(
      expect.objectContaining({
        hit,
        onAlertUpdated: expect.any(Function),
      })
    );

    const latestHeaderProps = mockDocumentHeader.mock.calls.at(-1)?.[0] as {
      onAlertUpdated: () => void;
    };

    act(() => {
      latestHeaderProps.onAlertUpdated();
    });

    await waitFor(() => {
      expect(useEsDocSearch).toHaveBeenLastCalledWith(
        expect.objectContaining({
          id: 'alert-1',
          index: 'alerts-index',
          dataView,
          skip: false,
        })
      );
    });
  });

  it('composes the Discover refresh callback with the flyout refetch callback', async () => {
    const hit = {
      id: '1',
      raw: { _id: 'alert-1', _index: 'alerts-index' },
      flattened: {},
    } as unknown as DataTableRecord;
    const onAlertUpdated = jest.fn();
    const dataView = {} as never;
    const store = createStore(() => ({}));

    render(
      <AlertFlyoutHeader
        hit={hit}
        dataView={dataView}
        servicesPromise={Promise.resolve(servicesMock)}
        storePromise={Promise.resolve(store as never)}
        onAlertUpdated={onAlertUpdated}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('MockDocumentHeader')).toBeInTheDocument();
    });

    const latestHeaderProps = mockDocumentHeader.mock.calls.at(-1)?.[0] as {
      onAlertUpdated: () => void;
    };

    act(() => {
      latestHeaderProps.onAlertUpdated();
    });

    expect(onAlertUpdated).toHaveBeenCalledTimes(1);
    await waitFor(() => {
      expect(useEsDocSearch).toHaveBeenLastCalledWith(
        expect.objectContaining({
          skip: false,
        })
      );
    });
  });
});
