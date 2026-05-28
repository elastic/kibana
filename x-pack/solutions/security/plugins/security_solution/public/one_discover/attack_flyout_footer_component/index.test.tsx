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
import { AttackFlyoutFooter } from '.';
import type { StartServices } from '../../types';
import { useAttackDetails } from '../../flyout_v2/attack_details/main/hooks/use_attack_details';

const mockFooter = jest.fn((props: unknown) => {
  const { hit } = props as { hit?: DataTableRecord };

  return <div>{`MockAttackFooter:${hit?.id ?? ''}`}</div>;
});

const mockFlyoutProviders = jest.fn(({ children }: { children: React.ReactNode }) => (
  <>{children}</>
));

jest.mock('../../flyout_v2/attack_details/main/footer', () => ({
  Footer: (props: unknown) => mockFooter(props),
}));

jest.mock('../../flyout_v2/attack_details/main/hooks/use_attack_details', () => ({
  useAttackDetails: jest.fn(),
}));

jest.mock('../../flyout_v2/shared/components/flyout_provider', () => ({
  flyoutProviders: (props: unknown) => mockFlyoutProviders(props as { children: React.ReactNode }),
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

describe('AttackFlyoutFooter', () => {
  const mockUseAttackDetails = jest.mocked(useAttackDetails);
  const mockRefetch = jest.fn();
  const mockOnAlertUpdated = jest.fn();

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
    mockUseAttackDetails.mockReturnValue({
      attack: { id: 'attack-1' },
      browserFields: {},
      dataFormattedForFieldBrowser: [],
      loading: false,
      refetch: mockRefetch,
      getFieldsData: jest.fn(),
      searchHit: undefined,
    } as unknown as ReturnType<typeof useAttackDetails>);
  });

  it('does not render before promises resolve', () => {
    const hit = {
      id: '1',
      raw: { _id: '1', _index: 'test' },
      flattened: {},
    } as unknown as DataTableRecord;
    const unresolvedServicesPromise = new Promise<StartServices>(() => undefined);
    const unresolvedStorePromise = new Promise<ReturnType<typeof createStore>>(() => undefined);

    render(
      <AttackFlyoutFooter
        hit={hit}
        servicesPromise={unresolvedServicesPromise}
        storePromise={unresolvedStorePromise as never}
        onAlertUpdated={mockOnAlertUpdated}
      />
    );

    expect(screen.queryByText(/MockAttackFooter/)).not.toBeInTheDocument();
    expect(mockFlyoutProviders).not.toHaveBeenCalled();
  });

  it('renders attack footer through flyoutProviders when dependencies resolve', async () => {
    const hit = {
      id: '1',
      raw: { _id: '1', _index: 'test' },
      flattened: {},
    } as unknown as DataTableRecord;
    const store = createStore(() => ({}));
    const storePromise = Promise.resolve(store as never);

    render(
      <AttackFlyoutFooter
        hit={hit}
        servicesPromise={Promise.resolve(servicesMock)}
        storePromise={storePromise}
        onAlertUpdated={mockOnAlertUpdated}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('MockAttackFooter:1')).toBeInTheDocument();
    });

    expect(mockFooter).toHaveBeenCalledWith(
      expect.objectContaining({
        hit,
        attack: { id: 'attack-1' },
        refetch: mockRefetch,
      })
    );
    expect(mockFlyoutProviders).toHaveBeenCalledWith(
      expect.objectContaining({
        services: servicesMock,
        store,
      })
    );
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
    } as unknown as ReturnType<typeof useAttackDetails>);

    const hit = {
      id: '1',
      raw: { _id: '1', _index: 'test' },
      flattened: {},
    } as unknown as DataTableRecord;
    const store = createStore(() => ({}));

    render(
      <AttackFlyoutFooter
        hit={hit}
        servicesPromise={Promise.resolve(servicesMock)}
        storePromise={Promise.resolve(store as never)}
        onAlertUpdated={mockOnAlertUpdated}
      />
    );

    await waitFor(() => {
      expect(mockFlyoutProviders).toHaveBeenCalled();
    });

    expect(screen.queryByText(/MockAttackFooter/)).not.toBeInTheDocument();
    expect(mockFooter).not.toHaveBeenCalled();
  });

  it('forwards onAlertUpdated to useAttackDetails as the refresh option so synchronous-resolution paths can still refetch', async () => {
    const hit = {
      id: '1',
      raw: { _id: '1', _index: 'test' },
      flattened: {},
    } as unknown as DataTableRecord;
    const store = createStore(() => ({}));

    render(
      <AttackFlyoutFooter
        hit={hit}
        servicesPromise={Promise.resolve(servicesMock)}
        storePromise={Promise.resolve(store as never)}
        onAlertUpdated={mockOnAlertUpdated}
      />
    );

    await waitFor(() => {
      expect(mockUseAttackDetails).toHaveBeenCalledWith(hit, { refresh: mockOnAlertUpdated });
    });
  });

  it('does not render footer when resolving dependencies fails', async () => {
    const hit = {
      id: '1',
      raw: { _id: '1', _index: 'test' },
      flattened: {},
    } as unknown as DataTableRecord;
    const store = createStore(() => ({}));

    render(
      <AttackFlyoutFooter
        hit={hit}
        servicesPromise={Promise.reject(new Error('services failed'))}
        storePromise={Promise.resolve(store as never)}
        onAlertUpdated={mockOnAlertUpdated}
      />
    );

    await waitFor(() => {
      expect(mockFlyoutProviders).not.toHaveBeenCalled();
    });
    expect(screen.queryByText(/MockAttackFooter/)).not.toBeInTheDocument();
    expect(mockFooter).not.toHaveBeenCalled();
  });
});
