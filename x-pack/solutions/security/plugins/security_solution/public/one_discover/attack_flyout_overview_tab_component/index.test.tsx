/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DataTableRecord } from '@kbn/discover-utils';
import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import TestRenderer from 'react-test-renderer';
import { createMemoryHistory } from 'history';
import { Router } from '@kbn/shared-ux-router';
import { createStore } from 'redux';
import { AttackFlyoutOverviewTab } from '.';
import type { StartServices } from '../../types';
import { useIsInSecurityApp } from '../../common/hooks/is_in_security_app';

const mockOverviewTab = jest.fn((props: unknown) => {
  const { onShowAttackEntities, onShowAttackCorrelations } = props as {
    onShowAttackEntities?: () => void;
    onShowAttackCorrelations?: () => void;
  };

  return (
    <>
      <button type="button" onClick={onShowAttackEntities}>
        {'show entities'}
      </button>
      <button type="button" onClick={onShowAttackCorrelations}>
        {'show correlations'}
      </button>
    </>
  );
});

jest.mock('../../flyout_v2/attack_details/main/tabs/overview_tab', () => ({
  OverviewTab: (props: unknown) => mockOverviewTab(props),
}));

jest.mock('../../flyout_v2/document/main/document_flyout_wrapper', () => ({
  DocumentFlyoutWrapper: () => <div>{'MockDocumentFlyoutWrapper'}</div>,
}));

jest.mock('../cell_actions', () => ({
  DiscoverCellActions: () => <div>{'MockDiscoverCellActions'}</div>,
}));

jest.mock('../../flyout_v2/attack_details/tools/entities', () => {
  const MockAttackEntities = () => <div>{'MockAttackEntities'}</div>;
  MockAttackEntities.displayName = 'AttackEntities';
  return { AttackEntities: MockAttackEntities };
});

jest.mock('../../flyout_v2/attack_details/tools/correlations', () => {
  const MockAttackCorrelations = () => <div>{'MockAttackCorrelations'}</div>;
  MockAttackCorrelations.displayName = 'AttackCorrelations';
  return { AttackCorrelations: MockAttackCorrelations };
});

jest.mock('../../flyout_v2/shared/hooks/use_default_flyout_properties', () => ({
  defaultToolsFlyoutProperties: {
    ownFocus: false,
    paddingSize: 'm',
    resizable: true,
    size: 'm',
  },
  useDefaultDocumentFlyoutProperties: () => ({
    maxWidth: 1200,
    minWidth: 384,
    ownFocus: false,
    paddingSize: 'm',
    resizable: true,
    size: 's',
  }),
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

describe('AttackFlyoutOverviewTab', () => {
  const mockUseIsInSecurityApp = jest.mocked(useIsInSecurityApp);
  const onAlertUpdated = jest.fn();

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
        <AttackFlyoutOverviewTab
          hit={hit}
          servicesPromise={new Promise(() => {})}
          storePromise={new Promise(() => {})}
          onAlertUpdated={onAlertUpdated}
        />
      </Router>
    );

    expect(container).toBeEmptyDOMElement();
  });

  it('renders OverviewTab with attack callbacks once dependencies resolve', async () => {
    const hit = {
      id: '1',
      raw: { _id: '1', _index: 'test' },
      flattened: {},
    } as unknown as DataTableRecord;
    const store = createStore(() => ({}));
    const history = createMemoryHistory({ initialEntries: ['/discover'] });

    render(
      <Router history={history}>
        <AttackFlyoutOverviewTab
          hit={hit}
          servicesPromise={Promise.resolve(servicesMock)}
          storePromise={Promise.resolve(store as never)}
          onAlertUpdated={onAlertUpdated}
        />
      </Router>
    );

    await waitFor(() => {
      expect(screen.getByText('show entities')).toBeInTheDocument();
    });

    expect(mockOverviewTab).toHaveBeenCalledWith(
      expect.objectContaining({
        hit,
        onShowAttackEntities: expect.any(Function),
        onShowAttackCorrelations: expect.any(Function),
      })
    );
  });

  it('opens AttackEntities in a nested system flyout', async () => {
    const hit = {
      id: '1',
      raw: { _id: '1', _index: 'test' },
      flattened: {},
    } as unknown as DataTableRecord;
    const store = createStore(() => ({}));
    const history = createMemoryHistory({ initialEntries: ['/discover'] });

    render(
      <Router history={history}>
        <AttackFlyoutOverviewTab
          hit={hit}
          servicesPromise={Promise.resolve(servicesMock)}
          storePromise={Promise.resolve(store as never)}
          onAlertUpdated={onAlertUpdated}
        />
      </Router>
    );

    await waitFor(() => {
      expect(screen.getByText('show entities')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('show entities'));

    expect(servicesMock.overlays.openSystemFlyout).toHaveBeenCalledTimes(1);

    const openSystemFlyout = servicesMock.overlays.openSystemFlyout as jest.Mock;
    const flyoutElement = openSystemFlyout.mock.calls[0]?.[0];
    const tree = TestRenderer.create(flyoutElement);
    const attackEntities = tree.root.findAll(
      (node) => (node.type as React.ComponentType)?.displayName === 'AttackEntities'
    );
    expect(attackEntities).toHaveLength(1);
  });

  it('opens AttackCorrelations in a nested system flyout', async () => {
    const hit = {
      id: '1',
      raw: { _id: '1', _index: 'test' },
      flattened: {},
    } as unknown as DataTableRecord;
    const store = createStore(() => ({}));
    const history = createMemoryHistory({ initialEntries: ['/discover'] });

    render(
      <Router history={history}>
        <AttackFlyoutOverviewTab
          hit={hit}
          servicesPromise={Promise.resolve(servicesMock)}
          storePromise={Promise.resolve(store as never)}
          onAlertUpdated={onAlertUpdated}
        />
      </Router>
    );

    await waitFor(() => {
      expect(screen.getByText('show correlations')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('show correlations'));

    expect(servicesMock.overlays.openSystemFlyout).toHaveBeenCalledTimes(1);

    const openSystemFlyout = servicesMock.overlays.openSystemFlyout as jest.Mock;
    const flyoutElement = openSystemFlyout.mock.calls[0]?.[0];
    const tree = TestRenderer.create(flyoutElement);
    const attackCorrelations = tree.root.findAll(
      (node) => (node.type as React.ComponentType)?.displayName === 'AttackCorrelations'
    );
    expect(attackCorrelations).toHaveLength(1);
  });
});
