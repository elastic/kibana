/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DataTableRecord } from '@kbn/discover-utils';
import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { createMemoryHistory } from 'history';
import { Router } from '@kbn/shared-ux-router';
import { createStore } from 'redux';
import TestRenderer from 'react-test-renderer';
import { DOC_VIEWER_FLYOUT_HISTORY_KEY } from '@kbn/unified-doc-viewer';
import { AttackFlyoutHeader } from '.';
import type { StartServices } from '../../types';
import { useAttackDetails } from '../../flyout_v2/attack_details/main/hooks/use_attack_details';
import { useIsInSecurityApp } from '../../common/hooks/is_in_security_app';
import { documentFlyoutHistoryKey } from '../../flyout_v2/shared/constants/flyout_history';

const mockHeaderTitle = jest.fn((props: unknown) => {
  const { onShowNotes } = props as { onShowNotes?: () => void };

  return (
    <button type="button" onClick={onShowNotes}>
      {'MockAttackHeaderTitle'}
    </button>
  );
});

jest.mock('../../flyout_v2/attack_details/main/components/header_title', () => ({
  HeaderTitle: (props: unknown) => mockHeaderTitle(props),
}));

jest.mock('../../flyout_v2/attack_details/main/hooks/use_attack_details', () => ({
  useAttackDetails: jest.fn(),
}));

jest.mock('../../flyout_v2/shared/tools/notes', () => ({
  NotesDetails: () => <div>{'MockNotesDetails'}</div>,
}));

jest.mock('../../common/hooks/is_in_security_app', () => ({
  useIsInSecurityApp: jest.fn(),
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

describe('AttackFlyoutHeader', () => {
  const mockUseAttackDetails = jest.mocked(useAttackDetails);
  const mockUseIsInSecurityApp = jest.mocked(useIsInSecurityApp);
  const mockRefetch = jest.fn();

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

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseIsInSecurityApp.mockReturnValue(false);
    mockUseAttackDetails.mockReturnValue({
      attack: { id: 'attack-1' },
      browserFields: {},
      dataFormattedForFieldBrowser: [{ category: 'test', field: 'test', values: [] }],
      loading: false,
      refetch: mockRefetch,
      getFieldsData: jest.fn(),
      searchHit: undefined,
    } as unknown as ReturnType<typeof useAttackDetails>);
  });

  it('renders nothing while services or store are not yet resolved', () => {
    const hit = {
      id: '1',
      raw: { _id: '1', _index: 'test' },
      flattened: {},
    } as unknown as DataTableRecord;
    const history = createMemoryHistory({ initialEntries: ['/discover'] });

    const { container } = render(
      <Router history={history}>
        <AttackFlyoutHeader
          hit={hit}
          servicesPromise={new Promise(() => {})}
          storePromise={new Promise(() => {})}
          onAlertUpdated={jest.fn()}
        />
      </Router>
    );

    expect(container).toBeEmptyDOMElement();
  });

  it('renders HeaderTitle with attack details once dependencies resolve', async () => {
    const hit = {
      id: '1',
      raw: { _id: '1', _index: 'test' },
      flattened: {},
    } as unknown as DataTableRecord;
    const store = createStore(() => ({}));
    const history = createMemoryHistory({ initialEntries: ['/discover'] });

    render(
      <Router history={history}>
        <AttackFlyoutHeader
          hit={hit}
          servicesPromise={Promise.resolve(servicesMock)}
          storePromise={Promise.resolve(store as never)}
          onAlertUpdated={jest.fn()}
        />
      </Router>
    );

    await waitFor(() => {
      expect(screen.getByText('MockAttackHeaderTitle')).toBeInTheDocument();
    });

    expect(mockHeaderTitle).toHaveBeenCalledWith(
      expect.objectContaining({
        attack: expect.objectContaining({ id: 'attack-1' }),
        browserFields: {},
        refetch: mockRefetch,
      })
    );
    expect(mockHeaderTitle).toHaveBeenCalledWith(expect.not.objectContaining({ hit }));
  });

  it('forwards onAlertUpdated to useAttackDetails as the refresh option so synchronous-resolution paths can still refetch', async () => {
    const hit = {
      id: '1',
      raw: { _id: '1', _index: 'test' },
      flattened: {},
    } as unknown as DataTableRecord;
    const store = createStore(() => ({}));
    const history = createMemoryHistory({ initialEntries: ['/discover'] });
    const onAlertUpdated = jest.fn();

    render(
      <Router history={history}>
        <AttackFlyoutHeader
          hit={hit}
          servicesPromise={Promise.resolve(servicesMock)}
          storePromise={Promise.resolve(store as never)}
          onAlertUpdated={onAlertUpdated}
        />
      </Router>
    );

    await waitFor(() => {
      expect(mockUseAttackDetails).toHaveBeenCalledWith(hit, { refresh: onAlertUpdated });
    });
  });

  it('renders nothing while attack details are loading', async () => {
    mockUseAttackDetails.mockReturnValue({
      attack: null,
      browserFields: {},
      dataFormattedForFieldBrowser: null,
      loading: true,
      refetch: mockRefetch,
      getFieldsData: jest.fn(),
      searchHit: undefined,
    });

    const hit = {
      id: '1',
      raw: { _id: '1', _index: 'test' },
      flattened: {},
    } as unknown as DataTableRecord;
    const store = createStore(() => ({}));
    const history = createMemoryHistory({ initialEntries: ['/discover'] });

    render(
      <Router history={history}>
        <AttackFlyoutHeader
          hit={hit}
          servicesPromise={Promise.resolve(servicesMock)}
          storePromise={Promise.resolve(store as never)}
          onAlertUpdated={jest.fn()}
        />
      </Router>
    );

    await waitFor(() => {
      expect(mockUseAttackDetails).toHaveBeenCalled();
    });

    expect(screen.queryByText('MockAttackHeaderTitle')).not.toBeInTheDocument();
  });

  it('opens notes in a nested system flyout from Discover header', async () => {
    const hit = {
      id: '1',
      raw: { _id: '1', _index: 'test' },
      flattened: {},
    } as unknown as DataTableRecord;
    const store = createStore(() => ({}));
    const history = createMemoryHistory({ initialEntries: ['/discover'] });

    render(
      <Router history={history}>
        <AttackFlyoutHeader
          hit={hit}
          servicesPromise={Promise.resolve(servicesMock)}
          storePromise={Promise.resolve(store as never)}
          onAlertUpdated={jest.fn()}
        />
      </Router>
    );

    await waitFor(() => {
      expect(screen.getByText('MockAttackHeaderTitle')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('MockAttackHeaderTitle'));

    expect(servicesMock.overlays.openSystemFlyout).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        historyKey: DOC_VIEWER_FLYOUT_HISTORY_KEY,
      })
    );
  });

  it('uses Security history key when opened inside Security app', async () => {
    mockUseIsInSecurityApp.mockReturnValue(true);

    const hit = {
      id: '1',
      raw: { _id: '1', _index: 'test' },
      flattened: {},
    } as unknown as DataTableRecord;
    const store = createStore(() => ({}));
    const history = createMemoryHistory({ initialEntries: ['/security'] });

    render(
      <Router history={history}>
        <AttackFlyoutHeader
          hit={hit}
          servicesPromise={Promise.resolve(servicesMock)}
          storePromise={Promise.resolve(store as never)}
          onAlertUpdated={jest.fn()}
        />
      </Router>
    );

    await waitFor(() => {
      expect(screen.getByText('MockAttackHeaderTitle')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('MockAttackHeaderTitle'));

    expect(servicesMock.overlays.openSystemFlyout).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        historyKey: documentFlyoutHistoryKey,
      })
    );
  });

  it('opens notes flyout with NotesDetails child', async () => {
    const hit = {
      id: '1',
      raw: { _id: '1', _index: 'test' },
      flattened: {},
    } as unknown as DataTableRecord;
    const store = createStore(() => ({}));
    const history = createMemoryHistory({ initialEntries: ['/discover'] });

    render(
      <Router history={history}>
        <AttackFlyoutHeader
          hit={hit}
          servicesPromise={Promise.resolve(servicesMock)}
          storePromise={Promise.resolve(store as never)}
          onAlertUpdated={jest.fn()}
        />
      </Router>
    );

    await waitFor(() => {
      expect(screen.getByText('MockAttackHeaderTitle')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('MockAttackHeaderTitle'));

    const openSystemFlyout = servicesMock.overlays.openSystemFlyout as jest.Mock;
    const flyoutElement = openSystemFlyout.mock.calls[0]?.[0];
    const tree = TestRenderer.create(flyoutElement);
    expect(tree.root.findByProps({ children: 'MockNotesDetails' })).toBeDefined();
  });
});
