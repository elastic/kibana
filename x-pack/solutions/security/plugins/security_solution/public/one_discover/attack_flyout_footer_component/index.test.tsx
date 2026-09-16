/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DataTableRecord } from '@kbn/discover-utils';
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { createStore } from 'redux-v4';
import { AttackFlyoutFooter } from '.';
import type { StartServices } from '../../types';
import type { AttackDiscoveryAlert } from '@kbn/elastic-assistant-common';

const mockFlyoutProviders = jest.fn(({ children }: { children: React.ReactNode }) => (
  <>{children}</>
));

jest.mock('../../flyout_v2/shared/components/flyout_provider', () => ({
  flyoutProviders: (props: unknown) => mockFlyoutProviders(props as { children: React.ReactNode }),
}));

const mockRefetch = jest.fn();
const mockAttack = { id: 'attack-1' } as unknown as AttackDiscoveryAlert;

jest.mock('../../flyout/attack_details/hooks/use_attack_details', () => ({
  useAttackDetails: jest.fn(() => ({
    attack: mockAttack,
    loading: false,
    refetch: mockRefetch,
  })),
}));

jest.mock('../../flyout_v2/attack/main/footer', () => ({
  Footer: ({ onAttackUpdated }: { onAttackUpdated: () => void }) => (
    <div data-test-subj="attackFooterMock">
      <button type="button" data-test-subj="attackFooterUpdateBtn" onClick={onAttackUpdated}>
        {'update'}
      </button>
    </div>
  ),
}));

jest.mock('../../flyout_v2/shared/components/flyout_loading', () => ({
  FlyoutLoading: () => <div data-test-subj="attackFlyoutFooterLoading" />,
}));

const { useAttackDetails } = jest.requireMock(
  '../../flyout/attack_details/hooks/use_attack_details'
);

describe('AttackFlyoutFooter', () => {
  beforeEach(() => {
    mockFlyoutProviders.mockClear();
    mockRefetch.mockClear();
    useAttackDetails.mockReturnValue({ attack: mockAttack, loading: false, refetch: mockRefetch });
  });

  const servicesMock = {
    overlays: { openSystemFlyout: jest.fn() },
    uiActions: {
      getTriggerCompatibleActions: jest.fn().mockResolvedValue([]),
    },
  } as unknown as StartServices;

  const buildHit = (workflowStatus: string = 'open'): DataTableRecord =>
    ({
      id: '1',
      raw: {
        _id: 'attack-1',
        _index: 'test-index',
        _source: { 'kibana.alert.workflow_status': workflowStatus },
      },
      flattened: { _id: 'attack-1', _index: 'test-index' },
    } as unknown as DataTableRecord);

  it('does not render before promises resolve', () => {
    render(
      <AttackFlyoutFooter
        hit={buildHit()}
        servicesPromise={new Promise<StartServices>(() => undefined)}
        storePromise={new Promise<ReturnType<typeof createStore>>(() => undefined) as never}
        onAttackUpdated={jest.fn()}
      />
    );

    expect(mockFlyoutProviders).not.toHaveBeenCalled();
  });

  it('renders footer through flyoutProviders when dependencies resolve', async () => {
    const store = createStore(() => ({}));

    render(
      <AttackFlyoutFooter
        hit={buildHit()}
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

    expect(screen.getByTestId('attackFooterMock')).toBeInTheDocument();
  });

  it('shows loading state while attack is fetching', async () => {
    useAttackDetails.mockReturnValue({ attack: null, loading: true, refetch: mockRefetch });
    const store = createStore(() => ({}));

    render(
      <AttackFlyoutFooter
        hit={buildHit()}
        servicesPromise={Promise.resolve(servicesMock)}
        storePromise={Promise.resolve(store as never)}
        onAttackUpdated={jest.fn()}
      />
    );

    await waitFor(() => {
      expect(screen.getByTestId('attackFlyoutFooterLoading')).toBeInTheDocument();
    });
  });

  it('calls both onAttackUpdated and refetch when onAttackUpdated fires', async () => {
    const onAttackUpdated = jest.fn();
    const store = createStore(() => ({}));

    render(
      <AttackFlyoutFooter
        hit={buildHit()}
        servicesPromise={Promise.resolve(servicesMock)}
        storePromise={Promise.resolve(store as never)}
        onAttackUpdated={onAttackUpdated}
      />
    );

    await waitFor(() => {
      expect(screen.getByTestId('attackFooterMock')).toBeInTheDocument();
    });

    screen.getByTestId('attackFooterUpdateBtn').click();

    expect(onAttackUpdated).toHaveBeenCalledTimes(1);
    expect(mockRefetch).toHaveBeenCalledTimes(1);
  });

  it('refetches when Discover hands the footer a new hit (so a header-triggered status change reaches it)', async () => {
    const store = createStore(() => ({}));

    const { rerender } = render(
      <AttackFlyoutFooter
        hit={buildHit('open')}
        servicesPromise={Promise.resolve(servicesMock)}
        storePromise={Promise.resolve(store as never)}
        onAttackUpdated={jest.fn()}
      />
    );

    await waitFor(() => {
      expect(screen.getByTestId('attackFooterMock')).toBeInTheDocument();
    });

    expect(mockRefetch).not.toHaveBeenCalled();

    rerender(
      <AttackFlyoutFooter
        hit={buildHit('closed')}
        servicesPromise={Promise.resolve(servicesMock)}
        storePromise={Promise.resolve(store as never)}
        onAttackUpdated={jest.fn()}
      />
    );

    expect(mockRefetch).toHaveBeenCalledTimes(1);
  });

  it('does not render when resolving dependencies fails', async () => {
    const store = createStore(() => ({}));

    render(
      <AttackFlyoutFooter
        hit={buildHit()}
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
