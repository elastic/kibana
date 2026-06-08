/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DataTableRecord } from '@kbn/discover-utils';
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { createStore } from 'redux';
import type { AttackDiscoveryAlert } from '@kbn/elastic-assistant-common';
import { AttackFlyoutOverviewTab } from '.';
import type { StartServices } from '../../types';

const mockFlyoutProviders = jest.fn(({ children }: { children: React.ReactNode }) => (
  <>{children}</>
));

jest.mock('../../flyout_v2/shared/components/flyout_provider', () => ({
  flyoutProviders: (props: unknown) => mockFlyoutProviders(props as { children: React.ReactNode }),
}));

const mockAttack = { id: 'attack-1' } as unknown as AttackDiscoveryAlert;
const mockGetAttackFromHit = jest.fn<AttackDiscoveryAlert | null, [DataTableRecord]>(
  () => mockAttack
);
jest.mock('../../flyout_v2/attack/main/utils/get_attack_from_hit', () => ({
  getAttackFromHit: (hit: DataTableRecord) => mockGetAttackFromHit(hit),
}));

jest.mock('../../flyout_v2/attack/main/tabs/overview_tab', () => ({
  OverviewTab: ({ onAttackUpdated }: { onAttackUpdated: () => void }) => (
    <button type="button" data-test-subj="attackOverviewTabMock" onClick={onAttackUpdated}>
      {'overview'}
    </button>
  ),
}));

describe('AttackFlyoutOverviewTab', () => {
  beforeEach(() => {
    mockFlyoutProviders.mockClear();
    mockGetAttackFromHit.mockClear();
    mockGetAttackFromHit.mockReturnValue(mockAttack);
  });

  const servicesMock = {
    overlays: { openSystemFlyout: jest.fn() },
    uiActions: {
      getTriggerCompatibleActions: jest.fn().mockResolvedValue([]),
    },
  } as unknown as StartServices;

  const hit = {
    id: '1',
    raw: { _id: 'attack-1', _index: 'test-index' },
    flattened: { _id: 'attack-1', _index: 'test-index' },
  } as unknown as DataTableRecord;

  it('does not render before promises resolve', () => {
    render(
      <AttackFlyoutOverviewTab
        hit={hit}
        servicesPromise={new Promise<StartServices>(() => undefined)}
        storePromise={new Promise<ReturnType<typeof createStore>>(() => undefined) as never}
        onAttackUpdated={jest.fn()}
      />
    );

    expect(mockFlyoutProviders).not.toHaveBeenCalled();
  });

  it('renders overview tab through flyoutProviders when dependencies resolve', async () => {
    const store = createStore(() => ({}));

    render(
      <AttackFlyoutOverviewTab
        hit={hit}
        servicesPromise={Promise.resolve(servicesMock)}
        storePromise={Promise.resolve(store as never)}
        onAttackUpdated={jest.fn()}
      />
    );

    await waitFor(() => {
      expect(mockFlyoutProviders).toHaveBeenCalledWith(
        expect.objectContaining({
          services: servicesMock,
          store,
        })
      );
    });

    expect(screen.getByTestId('attackOverviewTabMock')).toBeInTheDocument();
  });

  it('renders nothing when the hit cannot be transformed into an attack', async () => {
    mockGetAttackFromHit.mockReturnValue(null as unknown as AttackDiscoveryAlert);
    const store = createStore(() => ({}));

    render(
      <AttackFlyoutOverviewTab
        hit={hit}
        servicesPromise={Promise.resolve(servicesMock)}
        storePromise={Promise.resolve(store as never)}
        onAttackUpdated={jest.fn()}
      />
    );

    await waitFor(() => {
      expect(mockFlyoutProviders).toHaveBeenCalled();
    });

    expect(screen.queryByTestId('attackOverviewTabMock')).not.toBeInTheDocument();
  });

  it('forwards onAttackUpdated unchanged so Discover refresh stays the single source of truth', async () => {
    const onAttackUpdated = jest.fn();
    const store = createStore(() => ({}));

    render(
      <AttackFlyoutOverviewTab
        hit={hit}
        servicesPromise={Promise.resolve(servicesMock)}
        storePromise={Promise.resolve(store as never)}
        onAttackUpdated={onAttackUpdated}
      />
    );

    await waitFor(() => {
      expect(screen.getByTestId('attackOverviewTabMock')).toBeInTheDocument();
    });

    screen.getByTestId('attackOverviewTabMock').click();

    expect(onAttackUpdated).toHaveBeenCalledTimes(1);
  });

  it('re-derives attack from the latest hit so a header-triggered status change reaches the overview tab', async () => {
    const updatedHit = {
      id: '1',
      raw: {
        _id: 'attack-1',
        _index: 'test-index',
        _source: { 'kibana.alert.workflow_status': 'closed' },
      },
      flattened: { _id: 'attack-1', _index: 'test-index' },
    } as unknown as DataTableRecord;
    const store = createStore(() => ({}));

    const { rerender } = render(
      <AttackFlyoutOverviewTab
        hit={hit}
        servicesPromise={Promise.resolve(servicesMock)}
        storePromise={Promise.resolve(store as never)}
        onAttackUpdated={jest.fn()}
      />
    );

    await waitFor(() => {
      expect(screen.getByTestId('attackOverviewTabMock')).toBeInTheDocument();
    });

    expect(mockGetAttackFromHit).toHaveBeenLastCalledWith(hit);

    rerender(
      <AttackFlyoutOverviewTab
        hit={updatedHit}
        servicesPromise={Promise.resolve(servicesMock)}
        storePromise={Promise.resolve(store as never)}
        onAttackUpdated={jest.fn()}
      />
    );

    expect(mockGetAttackFromHit).toHaveBeenLastCalledWith(updatedHit);
  });

  it('does not render when resolving dependencies fails', async () => {
    const store = createStore(() => ({}));

    render(
      <AttackFlyoutOverviewTab
        hit={hit}
        servicesPromise={Promise.reject(new Error('services failed'))}
        storePromise={Promise.resolve(store as never)}
        onAttackUpdated={jest.fn()}
      />
    );

    await waitFor(() => {
      expect(mockFlyoutProviders).not.toHaveBeenCalled();
    });
  });
});
